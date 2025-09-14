# TaskMaster Supervision System
# Monitors and executes complete workflows every 5 minutes

param(
    [int]$Cycles = 24,     # Default: 2 hours (24 * 5min)
    [switch]$TestMode,     # Run in test mode (shorter intervals, more logging)
    [string]$ServiceId = "srv-d30eil7fte5s73eamba0",  # Default Render service ID
    [string]$LogPath = ".\logs\supervision.log"
)

# Ensure logs directory exists
if (-not (Test-Path ".\logs")) {
    New-Item -ItemType Directory -Path ".\logs" | Out-Null
}

# Initialize logging
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # Write to console with color
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN"  { "Yellow" }
        "SUCCESS" { "Green" }
        default { "Gray" }
    }
    Write-Host $logMessage -ForegroundColor $color
    
    # Write to log file
    Add-Content -Path $LogPath -Value $logMessage
}

# Telegram notification setup
$TelegramToken = $env:TELEGRAM_BOT_TOKEN
$ChatId = $env:TELEGRAM_CHAT_ID

# If not in environment, try to get from backend .env
if ((-not $TelegramToken -or -not $ChatId) -and (Test-Path "backend\.env")) {
    $envContent = Get-Content "backend\.env"
    foreach ($line in $envContent) {
        if ($line -match "TELEGRAM_BOT_TOKEN=(.+)") {
            $TelegramToken = $matches[1]
        }
        elseif ($line -match "TELEGRAM_CHAT_ID=(.+)") {
            $ChatId = $matches[1]
        }
    }
}

function Send-TelegramMessage {
    param([string]$Message)
    
    if (-not $TelegramToken -or -not $ChatId) {
        Write-Log "Telegram credentials not found - skipping notification" -Level "WARN"
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
        Write-Log "Telegram notification sent" -Level "SUCCESS"
    } catch {
        Write-Log "Failed to send Telegram: $($_.Exception.Message)" -Level "ERROR"
    }
}

# System health check functions
function Test-GitStatus {
    try {
        Write-Log "Checking Git repository status..."
        
        $currentCommit = (git rev-parse HEAD).Trim()
        $currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
        
        git fetch origin $currentBranch 2>$null
        $remoteCommit = (git rev-parse "origin/$currentBranch").Trim()
        
        return @{
            HasChanges = $currentCommit -ne $remoteCommit
            LocalCommit = $currentCommit
            RemoteCommit = $remoteCommit
            Branch = $currentBranch
            Success = $true
        }
    }
    catch {
        Write-Log "Git status check failed: $($_.Exception.Message)" -Level "ERROR"
        return @{
            HasChanges = $false
            Error = $_.Exception.Message
            Success = $false
        }
    }
}

function Test-RenderStatus {
    try {
        Write-Log "Checking Render service status..."
        
        $backendUrl = "https://$ServiceId.onrender.com"
        $frontendUrl = "https://warp-taskmaster-frontend.onrender.com"
        
        $backendHealth = Invoke-WebRequest "$backendUrl/api/v1/test" -UseBasicParsing -TimeoutSec 30
        $frontendHealth = Invoke-WebRequest $frontendUrl -UseBasicParsing -TimeoutSec 30
        
        return @{
            BackendHealthy = $backendHealth.StatusCode -eq 200
            FrontendHealthy = $frontendHealth.StatusCode -eq 200
            BackendStatus = $backendHealth.StatusCode
            FrontendStatus = $frontendHealth.StatusCode
            Success = $true
        }
    }
    catch {
        Write-Log "Render status check failed: $($_.Exception.Message)" -Level "ERROR"
        return @{
            BackendHealthy = $false
            FrontendHealthy = $false
            Error = $_.Exception.Message
            Success = $false
        }
    }
}

function Test-PlaywrightVerification {
    try {
        Write-Log "Running Playwright verification..."
        & .\mcp-supervisor-complete.ps1 -Cycles 1
        $success = $LASTEXITCODE -eq 0
        
        Write-Log "Playwright verification completed with status: $success" -Level $(if ($success) { "SUCCESS" } else { "ERROR" })
        
        return @{
            Success = $success
            ExitCode = $LASTEXITCODE
        }
    }
    catch {
        Write-Log "Playwright verification failed: $($_.Exception.Message)" -Level "ERROR"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# Status reporting
function Write-SupervisionReport {
    param($cycleResults)
    
    $status = if ($cycleResults.RenderStatus.Success -and $cycleResults.PlaywrightStatus.Success) {
        "✅ HEALTHY"
    }
    elseif (-not $cycleResults.RenderStatus.Success) {
        "❌ RENDER SERVICE ISSUES"
    }
    elseif (-not $cycleResults.PlaywrightStatus.Success) {
        "⚠️ PLAYWRIGHT VERIFICATION FAILED"
    }
    else {
        "⚠️ PARTIAL ISSUES"
    }
    
    $report = @"
🤖 Supervision Cycle Report
==========================
Time: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Status: $status
Cycle: $($cycleResults.CycleNumber)/$Cycles

Git Status:
- Branch: $($cycleResults.GitStatus.Branch)
- Changes: $(if ($cycleResults.GitStatus.HasChanges) { "Yes" } else { "No" })

Render Status:
- Backend: $(if ($cycleResults.RenderStatus.BackendHealthy) { "✅" } else { "❌" })
- Frontend: $(if ($cycleResults.RenderStatus.FrontendHealthy) { "✅" } else { "❌" })

Playwright:
- Tests: $(if ($cycleResults.PlaywrightStatus.Success) { "✅ Passed" } else { "❌ Failed" })
"@
    
    Write-Log $report
    Send-TelegramMessage $report
}

# Error handling
function Handle-SupervisionError {
    param($ErrorRecord)
    
    Write-Log $ErrorRecord.Exception.Message -Level "ERROR"
    
    $errorMsg = @"
🚨 *Supervision Error*
Type: $($ErrorRecord.CategoryInfo.Category)
Message: $($ErrorRecord.Exception.Message)
"@
    
    Send-TelegramMessage $errorMsg
    
    # Attempt recovery based on error type
    switch ($ErrorRecord.CategoryInfo.Category) {
        "ConnectionError" {
            Write-Log "Connection error detected. Waiting 30 seconds before retry..." -Level "WARN"
            Start-Sleep -Seconds 30
            return $true
        }
        default {
            return $false
        }
    }
}

# Main execution loop
Write-Log "Starting TaskMaster Supervision System" -Level "INFO"
Send-TelegramMessage "🎯 *TaskMaster Supervision Started*`nMonitoring interval: 5 minutes`nTotal cycles: $Cycles"

$cycleCount = 0
$startTime = Get-Date

while ($cycleCount -lt $Cycles) {
    $cycleCount++
    Write-Log "Starting cycle $cycleCount of $Cycles" -Level "INFO"
    
    try {
        # Run health checks
        $cycleResults = @{
            CycleNumber = $cycleCount
            GitStatus = Test-GitStatus
            RenderStatus = Test-RenderStatus
            PlaywrightStatus = Test-PlaywrightVerification
            Timestamp = Get-Date
        }
        
        # Generate and send report
        Write-SupervisionReport $cycleResults
        
        # Handle any detected issues
        if (-not $cycleResults.RenderStatus.Success) {
            Write-Log "Render service issues detected - initiating recovery..." -Level "WARN"
            
            if ($cycleResults.GitStatus.HasChanges) {
                Write-Log "Found Git changes - pushing to trigger deployment..." -Level "INFO"
                git push origin $cycleResults.GitStatus.Branch
            }
        }
        
        # Exit if in test mode and all checks passed
        if ($TestMode -and 
            $cycleResults.RenderStatus.Success -and 
            $cycleResults.PlaywrightStatus.Success) {
            Write-Log "Test mode: All checks passed. Exiting..." -Level "SUCCESS"
            break
        }
        
        # Wait for next cycle (unless in test mode or last cycle)
        if (-not $TestMode -and $cycleCount -lt $Cycles) {
            $nextCheck = (Get-Date).AddMinutes(5)
            Write-Log "Waiting 5 minutes for next cycle. Next check at $($nextCheck.ToString('HH:mm:ss'))" -Level "INFO"
            Start-Sleep -Seconds 300
        }
        elseif ($TestMode) {
            Write-Log "Test mode: Waiting 30 seconds for next cycle..." -Level "INFO"
            Start-Sleep -Seconds 30
        }
    }
    catch {
        if (-not (Handle-SupervisionError $_)) {
            Write-Log "Unrecoverable error occurred. Exiting supervision." -Level "ERROR"
            Send-TelegramMessage "🚨 *Supervision Terminated*`nUnrecoverable error: $($_.Exception.Message)"
            throw
        }
    }
}

# Final report
$duration = (Get-Date) - $startTime
$finalMsg = @"
🎯 *TaskMaster Supervision Complete*
Duration: $($duration.Minutes)m $($duration.Seconds)s
Cycles: $cycleCount/$Cycles
"@

Write-Log "Supervision complete. Sending final report..." -Level "SUCCESS"
Send-TelegramMessage $finalMsg