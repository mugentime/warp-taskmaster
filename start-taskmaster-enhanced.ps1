# 🚀 START TASKMASTER WITH ENHANCED AUDITOR
# ═══════════════════════════════════════════════
# 
# Safe startup script that:
# 1. Checks for existing instances
# 2. Verifies configurations
# 3. Starts with enhanced workflow validation

# Check for existing TaskMaster processes
$existingProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | 
    Where-Object { $_.CommandLine -like "*taskmaster*" }

if ($existingProcess) {
    Write-Host "⚠️  Found existing TaskMaster process (PID: $($existingProcess.Id))" -ForegroundColor Yellow
    Write-Host "   Stopping existing process for clean start..." -ForegroundColor Yellow
    Stop-Process -Id $existingProcess.Id -Force
    Start-Sleep -Seconds 2
}

# Verify log files
Write-Host "🧹 Cleaning up old log files..." -ForegroundColor Cyan
$oldLogs = @(
    "taskmaster.log",
    "taskmaster-error.log",
    "taskmaster-precision-fixed.log",
    "taskmaster-precision-fixed-error.log"
)

foreach ($log in $oldLogs) {
    if (Test-Path $log) {
        Move-Item $log "logs/archive_$((Get-Date).ToString('yyyyMMdd_HHmmss'))_$log" -Force
        Write-Host "   Archived: $log" -ForegroundColor Gray
    }
}

# Create fresh log files
New-Item -Path "taskmaster-enhanced.log" -ItemType File -Force | Out-Null
New-Item -Path "taskmaster-enhanced-error.log" -ItemType File -Force | Out-Null

# Verify required files exist
$requiredFiles = @(
    "workflow-auditor-enhanced.cjs",
    "taskmaster-unified.cjs",
    ".env"
)

$missingFiles = $requiredFiles | Where-Object { -not (Test-Path $_) }
if ($missingFiles) {
    Write-Host "❌ Missing required files:" -ForegroundColor Red
    $missingFiles | ForEach-Object { Write-Host "   • $_" -ForegroundColor Red }
    exit 1
}

# Verify API keys are configured
if (-not (Get-Content .env | Select-String "BINANCE_API_KEY=")) {
    Write-Host "❌ Binance API key not configured in .env" -ForegroundColor Red
    exit 1
}

if (-not (Get-Content .env | Select-String "TELEGRAM_BOT_TOKEN=")) {
    Write-Host "❌ Telegram bot token not configured in .env" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 STARTING TASKMASTER WITH ENHANCED AUDITOR..." -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host "⏱️  Enhanced validation timing enabled" -ForegroundColor Cyan
Write-Host "🔄 Order validation retries enabled" -ForegroundColor Cyan
Write-Host "⚖️  Proper delta-neutral verification" -ForegroundColor Cyan
Write-Host "📊 Full position status tracking" -ForegroundColor Cyan
Write-Host ""

# Start TaskMaster with output redirection
$processScript = {
    $taskmaster = Start-Process node -ArgumentList "taskmaster-unified.cjs" -RedirectStandardOutput "taskmaster-enhanced.log" -RedirectStandardError "taskmaster-enhanced-error.log" -PassThru -NoNewWindow
    Write-Host "✅ TaskMaster started (PID: $($taskmaster.Id))" -ForegroundColor Green
    Write-Host "📄 Logs:"
    Write-Host "   • Output: taskmaster-enhanced.log" -ForegroundColor Gray
    Write-Host "   • Errors: taskmaster-enhanced-error.log" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 Press Ctrl+C to stop gracefully" -ForegroundColor Yellow
    
    try {
        # Monitor the log file for startup success
        $startTime = Get-Date
        $maxWaitTime = [TimeSpan]::FromSeconds(30)
        $started = $false
        
        while (-not $started -and ((Get-Date) - $startTime) -lt $maxWaitTime) {
            if (Select-String -Path "taskmaster-enhanced.log" -Pattern "TASKMASTER.*ACTIVE" -Quiet) {
                Write-Host "`n✨ TaskMaster successfully initialized!" -ForegroundColor Green
                Write-Host "📱 Enhanced workflow notifications active" -ForegroundColor Cyan
                $started = $true
            }
            Start-Sleep -Seconds 1
        }
        
        if (-not $started) {
            Write-Host "`n⚠️  TaskMaster startup taking longer than expected..." -ForegroundColor Yellow
            Write-Host "   Check logs for details" -ForegroundColor Yellow
        }
        
        # Keep the script running and show a spinner
        $spinner = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
        $i = 0
        while (-not $taskmaster.HasExited) {
            Write-Host "`r$($spinner[$i % $spinner.Length]) TaskMaster running..." -NoNewline -ForegroundColor Cyan
            Start-Sleep -Milliseconds 100
            $i++
        }
        
    } finally {
        if (-not $taskmaster.HasExited) {
Write-Host "Stopping TaskMaster..." -ForegroundColor Yellow
            Stop-Process -Id $taskmaster.Id -Force
        }
    }
}

# Start the monitoring script in a job
$job = Start-Job -ScriptBlock $processScript

# Show the job output in real-time
while ($job.State -eq 'Running') {
    Receive-Job $job
    Start-Sleep -Milliseconds 100
}

# Final cleanup
Receive-Job $job
Remove-Job $job
