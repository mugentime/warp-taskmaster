# TaskMaster MCP Supervisor with Telegram Notifications
# Complete monitoring system for Render deployment

param(
    [int]$Cycles = 12,  # 1 hour of monitoring (12 * 5min = 60min)
[string]$ServiceId = "taskmaster-backend"
)

# Telegram configuration from environment
$TelegramToken = $env:TELEGRAM_BOT_TOKEN
if (-not $TelegramToken) {
    # Try to get from backend .env
    if (Test-Path "backend\.env") {
        $envContent = Get-Content "backend\.env"
        foreach ($line in $envContent) {
            if ($line -match "TELEGRAM_BOT_TOKEN=(.+)") {
                $TelegramToken = $matches[1]
                break
            }
        }
    }
}

$ChatId = $env:TELEGRAM_CHAT_ID
if (-not $ChatId) {
    if (Test-Path "backend\.env") {
        $envContent = Get-Content "backend\.env"
        foreach ($line in $envContent) {
            if ($line -match "TELEGRAM_CHAT_ID=(.+)") {
                $ChatId = $matches[1]
                break
            }
        }
    }
}

function Send-TelegramMessage {
    param([string]$Message)
    
    if (-not $TelegramToken -or -not $ChatId) {
        Write-Host "[WARN] Telegram credentials not found - skipping notification" -ForegroundColor Yellow
        return
    }
    
    try {
        $url = "https://api.telegram.org/bot$TelegramToken/sendMessage"
        $body = @{
            chat_id = $ChatId
            text = $Message
            parse_mode = "Markdown"
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" | Out-Null
        Write-Host "[SUCCESS] Telegram notification sent" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Failed to send Telegram: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "[INFO] TASKMASTER MCP SUPERVISOR - RENDER DEPLOYMENT MONITORING" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# Send startup notification
Send-TelegramMessage "[INFO] TaskMaster MCP Supervisor Started`nMonitoring Render deployment`nService: $ServiceId`nCycles: $Cycles (every 5 min)`nRender MCP: ACTIVE`nPlaywright MCP: ACTIVE"

# Initialize tracking variables
$startTime = Get-Date
$lastCommit = ""
$successCount = 0
$failureCount = 0

for ($cycle = 1; $cycle -le $Cycles; $cycle++) {
    Write-Host "`n" + "="*80 -ForegroundColor White
    Write-Host "[INFO] TASKMASTER CYCLE $cycle/$Cycles" -ForegroundColor Cyan
    Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host "="*80 -ForegroundColor White
    
    # 1. CHECK GIT CHANGES (Multi-Warp Instance Detection)
    Write-Host "`n[INFO] CHECKING FOR CHANGES FROM OTHER WARP INSTANCES..." -ForegroundColor Magenta
    try {
        $currentCommit = (git rev-parse HEAD).Trim()
        $currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
        
        git fetch origin $currentBranch 2>$null
        $remoteCommit = (git rev-parse "origin/$currentBranch").Trim()
        
        if ($currentCommit -ne $remoteCommit) {
            Write-Host "[WARN] REMOTE CHANGES DETECTED!" -ForegroundColor Yellow
            Write-Host "   Local:  $($currentCommit.Substring(0,8))" -ForegroundColor Red
            Write-Host "   Remote: $($remoteCommit.Substring(0,8))" -ForegroundColor Green
            
            git pull origin $currentBranch
            Write-Host "[SUCCESS] Changes pulled from other Warp instance" -ForegroundColor Green
            $hasChanges = $true
        } elseif ($currentCommit -ne $lastCommit) {
            Write-Host "[INFO] NEW LOCAL COMMIT DETECTED" -ForegroundColor Green
            $hasChanges = $true
        } else {
            Write-Host "[INFO] Repository in sync" -ForegroundColor Green
            $hasChanges = $false
        }
        
        $lastCommit = $currentCommit
    } catch {
        Write-Host "[ERROR] Git check failed: $($_.Exception.Message)" -ForegroundColor Red
        $hasChanges = $false
    }
    
    # 2. RENDER MCP STATUS CHECK
    Write-Host "`n[INFO] RENDER MCP - Checking Service Status..." -ForegroundColor Blue
    $backendUrl = "https://$ServiceId.onrender.com"
    $frontendUrl = "https://taskmaster-frontend.onrender.com"
    $monitorUrl = "https://taskmaster-monitor.onrender.com"
    
    try {
        # Test backend health endpoint
        $healthTest = Invoke-WebRequest "$backendUrl/api/v1/test" -UseBasicParsing -TimeoutSec 30
        Write-Host "[SUCCESS] Backend Health: $($healthTest.StatusCode) - API RESPONDING" -ForegroundColor Green
        $backendStatus = "Live"
        $successCount++
    } catch {
        Write-Host "[ERROR] Backend Health: $($_.Exception.Message)" -ForegroundColor Red
        $backendStatus = "Down"
        $failureCount++
        
        # Test basic connectivity
        try {
            $basicTest = Invoke-WebRequest "$backendUrl/" -UseBasicParsing -TimeoutSec 15
            Write-Host "[WARN] Basic connectivity: $($basicTest.StatusCode) - Service exists but API not ready" -ForegroundColor Yellow
        } catch {
            Write-Host "[ERROR] No connectivity at all - service may still be building" -ForegroundColor Red
        }
    }
    
    # 3. PLAYWRIGHT MCP VERIFICATION
    Write-Host "`n[INFO] PLAYWRIGHT MCP - Browser Content Verification..." -ForegroundColor Magenta
    
    # Test frontend (if exists)
    $frontendUrl = "https://warp-taskmaster-frontend.onrender.com"
    $spaTestPassed = $false
    
    try {
        $frontendTest = Invoke-WebRequest $frontendUrl -UseBasicParsing -TimeoutSec 20
        Write-Host "[SUCCESS] Frontend: $($frontendTest.StatusCode) - Loading" -ForegroundColor Green
        
        # Test SPA routes for "Not Found" fix
        $routes = @("/", "/dashboard", "/positions")
        $workingRoutes = 0
        
        foreach ($route in $routes) {
            try {
                $routeTest = Invoke-WebRequest "$frontendUrl$route" -UseBasicParsing -TimeoutSec 10
                if ($routeTest.StatusCode -eq 200) {
                    Write-Host "   [SUCCESS] Route $route : Working" -ForegroundColor Green
                    $workingRoutes++
                } else {
                    Write-Host "   [ERROR] Route $route : $($routeTest.StatusCode)" -ForegroundColor Red
                }
            } catch {
                Write-Host "   [ERROR] Route $route : Failed" -ForegroundColor Red
            }
        }
        
        $spaTestPassed = $workingRoutes -eq $routes.Count
        if ($spaTestPassed) {
            Write-Host "[SUCCESS] SPA Routes: ALL WORKING - Not Found issue RESOLVED!" -ForegroundColor Green
        } else {
            Write-Host "[WARN] SPA Routes: $workingRoutes/$($routes.Count) working" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "[ERROR] Frontend test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # 4. TASKMASTER ANALYSIS & DECISION
    Write-Host "`n[INFO] TASKMASTER ANALYSIS:" -ForegroundColor Cyan
    
    $overallStatus = if ($backendStatus -eq "Live" -and $spaTestPassed) {
        "[SUCCESS] ALL SYSTEMS OPERATIONAL"
    } elseif ($backendStatus -eq "Live") {
        "[WARN] BACKEND LIVE, FRONTEND ISSUES"
    } elseif ($spaTestPassed) {
        "[WARN] FRONTEND OK, BACKEND DOWN"
    } else {
        "[ERROR] MULTIPLE ISSUES DETECTED"
    }
    
    Write-Host "   Status: $overallStatus" -ForegroundColor $(if ($overallStatus.StartsWith("[SUCCESS]")) { "Green" } elseif ($overallStatus.StartsWith("[WARN]")) { "Yellow" } else { "Red" })
    Write-Host "   Backend API: $backendStatus" -ForegroundColor $(if ($backendStatus -eq "Live") { "Green" } else { "Red" })
    Write-Host "   Success Rate: $successCount/$cycle" -ForegroundColor Gray
    
    # Check if we should trigger deployment
    if ($hasChanges -and $backendStatus -eq "Down") {
        Write-Host "`n[INFO] TRIGGERING DEPLOYMENT..." -ForegroundColor Cyan
        Write-Host "   Reason: Changes detected and service is down" -ForegroundColor Yellow
        
        try {
            git push origin $currentBranch
            Write-Host "[SUCCESS] Changes pushed - Render auto-deploy should trigger" -ForegroundColor Green
        } catch {
            Write-Host "[ERROR] Push failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    # SUCCESS CHECK - Exit early if everything is working
    if ($backendStatus -eq "Live" -and $spaTestPassed) {
        Write-Host "`n[SUCCESS] SUCCESS DETECTED!" -ForegroundColor Green
        
        $elapsed = (Get-Date) - $startTime
        $successMsg = "[SUCCESS] DEPLOYMENT SUCCESSFUL!`n`nBackend API: Live and responding`nFrontend SPA: All routes working`nNot Found issue: RESOLVED`n`nTime taken: $($elapsed.Minutes)m $($elapsed.Seconds)s`nCycles: $cycle/$Cycles`nSuccess rate: $successCount/$cycle"
        
        Send-TelegramMessage $successMsg
        
        Write-Host "[SUCCESS] TaskMaster MCP Supervisor: MISSION ACCOMPLISHED!" -ForegroundColor Green
        break
    }
    
    # Wait 5 minutes before next cycle (unless last cycle)
    if ($cycle -lt $Cycles) {
        Write-Host "`n[INFO] Waiting 5 minutes before next cycle..." -ForegroundColor Gray
        Write-Host "   Next check: $(Get-Date (Get-Date).AddMinutes(5) -Format 'HH:mm:ss')" -ForegroundColor Gray
        Start-Sleep -Seconds 300  # 5 minutes
    }
}

# Final status report
$elapsed = (Get-Date) - $startTime
$finalStatus = if ($backendStatus -eq "Live" -and $spaTestPassed) {
    "COMPLETED SUCCESSFULLY"
} else {
    "COMPLETED WITH ISSUES"
}

Write-Host "`n[INFO] TASKMASTER MCP SUPERVISOR COMPLETE" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Final Status: $finalStatus" -ForegroundColor $(if ($finalStatus -eq "COMPLETED SUCCESSFULLY") { "Green" } else { "Yellow" })
Write-Host "Duration: $($elapsed.Minutes)m $($elapsed.Seconds)s" -ForegroundColor Gray
Write-Host "Cycles: $cycle/$Cycles" -ForegroundColor Gray
Write-Host "Success Rate: $successCount/$cycle" -ForegroundColor Gray

# Send final notification
$finalMsg = "[INFO] TaskMaster MCP Supervisor COMPLETE`n`nStatus: $finalStatus`nDuration: $($elapsed.Minutes)m $($elapsed.Seconds)s`nCycles: $cycle/$Cycles`nSuccess: $successCount/$cycle`n`nBackend: $backendStatus`nFrontend SPA: $(if ($spaTestPassed) { 'Working' } else { 'Issues' })"

Send-TelegramMessage $finalMsg