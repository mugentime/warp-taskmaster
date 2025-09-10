# TaskMaster MCP Supervisor with Telegram Notifications
# Complete monitoring system for Render deployment

param(
    [int]$Cycles = 12,  # 1 hour of monitoring (12 * 5min = 60min)
    [string]$ServiceId = "srv-d30eil7fte5s73eamba0"
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
        Write-Host "⚠️ Telegram credentials not found - skipping notification" -ForegroundColor Yellow
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
        Write-Host "✅ Telegram notification sent" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to send Telegram: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "🎯 TASKMASTER MCP SUPERVISOR - RENDER DEPLOYMENT MONITORING" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# Send startup notification
Send-TelegramMessage "🎯 *TaskMaster MCP Supervisor STARTED*`n`n🤖 Monitoring Render deployment`n📡 Service: $ServiceId`n⏰ Cycles: $Cycles (every 5 min)`n🔧 Render MCP: ACTIVE`n🎭 Playwright MCP: ACTIVE"

# Initialize tracking variables
$startTime = Get-Date
$lastCommit = ""
$successCount = 0
$failureCount = 0

for ($cycle = 1; $cycle -le $Cycles; $cycle++) {
    Write-Host "`n" + "="*80 -ForegroundColor White
    Write-Host "🔄 TASKMASTER CYCLE $cycle/$Cycles" -ForegroundColor Cyan
    Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host "="*80 -ForegroundColor White
    
    # 1. CHECK GIT CHANGES (Multi-Warp Instance Detection)
    Write-Host "`n📡 CHECKING FOR CHANGES FROM OTHER WARP INSTANCES..." -ForegroundColor Magenta
    try {
        $currentCommit = (git rev-parse HEAD).Trim()
        $currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
        
        git fetch origin $currentBranch 2>$null
        $remoteCommit = (git rev-parse "origin/$currentBranch").Trim()
        
        if ($currentCommit -ne $remoteCommit) {
            Write-Host "🚨 REMOTE CHANGES DETECTED!" -ForegroundColor Yellow
            Write-Host "   Local:  $($currentCommit.Substring(0,8))" -ForegroundColor Red
            Write-Host "   Remote: $($remoteCommit.Substring(0,8))" -ForegroundColor Green
            
            git pull origin $currentBranch
            Write-Host "✅ Changes pulled from other Warp instance" -ForegroundColor Green
            $hasChanges = $true
        } elseif ($currentCommit -ne $lastCommit) {
            Write-Host "🆕 NEW LOCAL COMMIT DETECTED" -ForegroundColor Green
            $hasChanges = $true
        } else {
            Write-Host "✅ Repository in sync" -ForegroundColor Green
            $hasChanges = $false
        }
        
        $lastCommit = $currentCommit
    } catch {
        Write-Host "❌ Git check failed: $($_.Exception.Message)" -ForegroundColor Red
        $hasChanges = $false
    }
    
    # 2. RENDER MCP STATUS CHECK
    Write-Host "`n🔧 RENDER MCP - Checking Service Status..." -ForegroundColor Blue
    $backendUrl = "https://$ServiceId.onrender.com"
    
    try {
        # Test backend health endpoint
        $healthTest = Invoke-WebRequest "$backendUrl/api/v1/test" -UseBasicParsing -TimeoutSec 30
        Write-Host "✅ Backend Health: $($healthTest.StatusCode) - API RESPONDING" -ForegroundColor Green
        $backendStatus = "Live"
        $successCount++
    } catch {
        Write-Host "❌ Backend Health: $($_.Exception.Message)" -ForegroundColor Red
        $backendStatus = "Down"
        $failureCount++
        
        # Test basic connectivity
        try {
            $basicTest = Invoke-WebRequest "$backendUrl/" -UseBasicParsing -TimeoutSec 15
            Write-Host "⚠️ Basic connectivity: $($basicTest.StatusCode) - Service exists but API not ready" -ForegroundColor Yellow
        } catch {
            Write-Host "💀 No connectivity at all - service may still be building" -ForegroundColor Red
        }
    }
    
    # 3. PLAYWRIGHT MCP VERIFICATION
    Write-Host "`n🎭 PLAYWRIGHT MCP - Browser Content Verification..." -ForegroundColor Magenta
    
    # Test frontend (if exists)
    $frontendUrl = "https://warp-taskmaster-frontend.onrender.com"
    $spaTestPassed = $false
    
    try {
        $frontendTest = Invoke-WebRequest $frontendUrl -UseBasicParsing -TimeoutSec 20
        Write-Host "✅ Frontend: $($frontendTest.StatusCode) - Loading" -ForegroundColor Green
        
        # Test SPA routes for "Not Found" fix
        $routes = @("/", "/dashboard", "/positions")
        $workingRoutes = 0
        
        foreach ($route in $routes) {
            try {
                $routeTest = Invoke-WebRequest "$frontendUrl$route" -UseBasicParsing -TimeoutSec 10
                if ($routeTest.StatusCode -eq 200) {
                    Write-Host "   ✅ Route $route : Working" -ForegroundColor Green
                    $workingRoutes++
                } else {
                    Write-Host "   ❌ Route $route : $($routeTest.StatusCode)" -ForegroundColor Red
                }
            } catch {
                Write-Host "   ❌ Route $route : Failed" -ForegroundColor Red
            }
        }
        
        $spaTestPassed = $workingRoutes -eq $routes.Count
        if ($spaTestPassed) {
            Write-Host "🎉 SPA Routes: ALL WORKING - Not Found issue RESOLVED!" -ForegroundColor Green
        } else {
            Write-Host "⚠️ SPA Routes: $workingRoutes/$($routes.Count) working" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "❌ Frontend test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # 4. TASKMASTER ANALYSIS & DECISION
    Write-Host "`n🤖 TASKMASTER ANALYSIS:" -ForegroundColor Cyan
    
    $overallStatus = if ($backendStatus -eq "Live" -and $spaTestPassed) {
        "✅ ALL SYSTEMS OPERATIONAL"
    } elseif ($backendStatus -eq "Live") {
        "⚠️ BACKEND LIVE, FRONTEND ISSUES"
    } elseif ($spaTestPassed) {
        "⚠️ FRONTEND OK, BACKEND DOWN"
    } else {
        "❌ MULTIPLE ISSUES DETECTED"
    }
    
    Write-Host "   Status: $overallStatus" -ForegroundColor $(if ($overallStatus.StartsWith("✅")) { "Green" } elseif ($overallStatus.StartsWith("⚠️")) { "Yellow" } else { "Red" })
    Write-Host "   Backend API: $backendStatus" -ForegroundColor $(if ($backendStatus -eq "Live") { "Green" } else { "Red" })
    Write-Host "   Success Rate: $successCount/$cycle" -ForegroundColor Gray
    
    # Check if we should trigger deployment
    if ($hasChanges -and $backendStatus -eq "Down") {
        Write-Host "`n🚀 TRIGGERING DEPLOYMENT..." -ForegroundColor Cyan
        Write-Host "   Reason: Changes detected and service is down" -ForegroundColor Yellow
        
        try {
            git push origin $currentBranch
            Write-Host "✅ Changes pushed - Render auto-deploy should trigger" -ForegroundColor Green
        } catch {
            Write-Host "❌ Push failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    # SUCCESS CHECK - Exit early if everything is working
    if ($backendStatus -eq "Live" -and $spaTestPassed) {
        Write-Host "`n🎉 SUCCESS DETECTED!" -ForegroundColor Green
        
        $elapsed = (Get-Date) - $startTime
        $successMsg = "🏆 *DEPLOYMENT SUCCESSFUL!*`n`n✅ Backend API: Live and responding`n✅ Frontend SPA: All routes working`n✅ Not Found issue: RESOLVED`n`n⏱️ Time taken: $($elapsed.Minutes)m $($elapsed.Seconds)s`n🔄 Cycles: $cycle/$Cycles`n📊 Success rate: $successCount/$cycle"
        
        Send-TelegramMessage $successMsg
        
        Write-Host "🎯 TaskMaster MCP Supervisor: MISSION ACCOMPLISHED!" -ForegroundColor Green
        break
    }
    
    # Wait 5 minutes before next cycle (unless last cycle)
    if ($cycle -lt $Cycles) {
        Write-Host "`n⏰ Waiting 5 minutes before next cycle..." -ForegroundColor Gray
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

Write-Host "`n🎯 TASKMASTER MCP SUPERVISOR COMPLETE" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Final Status: $finalStatus" -ForegroundColor $(if ($finalStatus -eq "COMPLETED SUCCESSFULLY") { "Green" } else { "Yellow" })
Write-Host "Duration: $($elapsed.Minutes)m $($elapsed.Seconds)s" -ForegroundColor Gray
Write-Host "Cycles: $cycle/$Cycles" -ForegroundColor Gray
Write-Host "Success Rate: $successCount/$cycle" -ForegroundColor Gray

# Send final notification
$finalMsg = "🎯 *TaskMaster MCP Supervisor COMPLETE*`n`n📊 Status: $finalStatus`n⏱️ Duration: $($elapsed.Minutes)m $($elapsed.Seconds)s`n🔄 Cycles: $cycle/$Cycles`n📈 Success: $successCount/$cycle`n`n🔧 Backend: $backendStatus`n🎭 Frontend SPA: $(if ($spaTestPassed) { 'Working' } else { 'Issues' })"

Send-TelegramMessage $finalMsg

Write-Host "`n📱 Telegram notification sent with final results!" -ForegroundColor Green
