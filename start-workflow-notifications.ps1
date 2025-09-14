# 🔔 START WORKFLOW COMPLETION NOTIFICATIONS
# ══════════════════════════════════════════
# 
# Starts Telegram notifications for every TaskMaster workflow completion
# Duration: 1 hour
# 
# Usage: .\start-workflow-notifications.ps1

Write-Host "🔔 STARTING WORKFLOW COMPLETION NOTIFICATIONS..." -ForegroundColor Green
Write-Host "⏰ Duration: 1 hour" -ForegroundColor Yellow  
Write-Host "📱 Telegram notifications will be sent for each completed workflow" -ForegroundColor Cyan

# Check if TaskMaster is running
$taskmasterProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*taskmaster*" -or $_.CommandLine -like "*taskmaster*" }

if (-not $taskmasterProcess) {
    Write-Host "⚠️  WARNING: No TaskMaster process detected" -ForegroundColor Yellow
    Write-Host "   Make sure TaskMaster is running before starting notifications" -ForegroundColor Yellow
}

# Check if log file exists
$logFiles = @(
    "taskmaster-precision-fixed.log",
    "taskmaster-unified.log", 
    "taskmaster-final.log",
    "taskmaster.log"
)

$activeLogFile = $null
foreach ($logFile in $logFiles) {
    if (Test-Path $logFile) {
        $activeLogFile = $logFile
        Write-Host "📄 Found log file: $logFile" -ForegroundColor Green
        break
    }
}

if (-not $activeLogFile) {
    Write-Host "❌ No TaskMaster log file found!" -ForegroundColor Red
    Write-Host "   Expected files: $($logFiles -join ', ')" -ForegroundColor Red
    Write-Host "   Make sure TaskMaster is running and logging to a file" -ForegroundColor Yellow
    exit 1
}

# Check if Telegram is configured
if (-not $env:TELEGRAM_BOT_TOKEN -or -not $env:TELEGRAM_CHAT_ID) {
    Write-Host "❌ Telegram not configured!" -ForegroundColor Red
    Write-Host "   Please ensure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set in .env" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Telegram configured - Chat ID: $env:TELEGRAM_CHAT_ID" -ForegroundColor Green

# Start the workflow notification monitoring
try {
    Write-Host ""
    Write-Host "🚀 LAUNCHING WORKFLOW COMPLETION MONITOR..." -ForegroundColor Magenta
    Write-Host "   • Monitoring file: $activeLogFile" -ForegroundColor White
    Write-Host "   • Notification duration: 1 hour" -ForegroundColor White
    Write-Host "   • Will detect and report every completed workflow cycle" -ForegroundColor White
    Write-Host ""
    Write-Host "Press Ctrl+C to stop monitoring early" -ForegroundColor Yellow
    Write-Host ""
    
    # Run the notification script
    node add-workflow-notifications.cjs
    
} catch {
    Write-Host "❌ Failed to start workflow notifications: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Workflow completion monitoring finished!" -ForegroundColor Green
Write-Host "📊 Check your Telegram for the notification summary" -ForegroundColor Cyan
