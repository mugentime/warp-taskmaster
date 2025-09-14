# 🚀 START ENHANCED TASKMASTER
# ═══════════════════════════════

# Ensure proper position sizing and delta-neutral validation
# with comprehensive safety checks and monitoring

Write-Host "🔧 PREPARING TASKMASTER RESTART..." -ForegroundColor Cyan

# Stop any existing processes
$existing = Get-Process -Name "node" -ErrorAction SilentlyContinue | 
    Where-Object { $_.CommandLine -like "*taskmaster*" }
if ($existing) {
    Write-Host "Stopping existing TaskMaster processes..." -ForegroundColor Yellow
    Stop-Process -Id $existing.Id -Force
    Start-Sleep -Seconds 2
}

# Archive old logs
$logDir = "logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$oldLogs = Get-ChildItem -Filter "taskmaster*.log"
foreach ($log in $oldLogs) {
    $archivePath = Join-Path $logDir "archive_${timestamp}_$($log.Name)"
    Move-Item $log.FullName $archivePath -Force
    Write-Host "Archived: $($log.Name)" -ForegroundColor Gray
}

# Create fresh log files
$mainLog = "taskmaster-enhanced.log"
$errorLog = "taskmaster-enhanced-error.log"
New-Item -Path $mainLog -ItemType File -Force | Out-Null
New-Item -Path $errorLog -ItemType File -Force | Out-Null

# Verify environment
Write-Host "`n🔍 VERIFYING ENVIRONMENT..." -ForegroundColor Cyan

# Check required files
$requiredFiles = @(
    "taskmaster-unified.cjs",
    "workflow-auditor-enhanced.cjs",
    ".env"
)

$missingFiles = $requiredFiles | Where-Object { -not (Test-Path $_) }
if ($missingFiles) {
    Write-Host "❌ Missing required files:" -ForegroundColor Red
    $missingFiles | ForEach-Object { Write-Host "   • $_" -ForegroundColor Red }
    exit 1
}

# Verify API keys
if (-not (Get-Content .env | Select-String "BINANCE_API_KEY=")) {
    Write-Host "❌ Binance API key not configured in .env" -ForegroundColor Red
    exit 1
}

if (-not (Get-Content .env | Select-String "TELEGRAM_BOT_TOKEN=")) {
    Write-Host "❌ Telegram bot token not configured in .env" -ForegroundColor Red
    exit 1
}

Write-Host "`n🔍 CHECKING BINANCE CONNECTION..." -ForegroundColor Cyan
node check-positions.cjs
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to connect to Binance" -ForegroundColor Red
    Write-Host "   Check your API keys and network connection" -ForegroundColor Red
    exit 1
}

Write-Host "`n🚀 STARTING ENHANCED TASKMASTER..." -ForegroundColor Green
Write-Host "═══════════════════════════════════" -ForegroundColor Green
Write-Host "✨ New Features & Improvements:" -ForegroundColor Cyan
Write-Host "   • Proper 1:1 delta-neutral position sizing" -ForegroundColor White
Write-Host "   • Enhanced position validation with retries" -ForegroundColor White
Write-Host "   • Automatic imbalance correction" -ForegroundColor White
Write-Host "   • Comprehensive workflow audit logging" -ForegroundColor White
Write-Host "   • Real-time position monitoring" -ForegroundColor White
Write-Host ""

# Start TaskMaster with monitoring
$processScript = {
    $taskmaster = Start-Process node -ArgumentList "taskmaster-unified.cjs" -RedirectStandardOutput $mainLog -RedirectStandardError $errorLog -PassThru -NoNewWindow
    Write-Host "✅ TaskMaster started (PID: $($taskmaster.Id))" -ForegroundColor Green
    Write-Host "📄 Logs:" -ForegroundColor White
    Write-Host "   • Output: $mainLog" -ForegroundColor Gray
    Write-Host "   • Errors: $errorLog" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 Press Ctrl+C to stop gracefully" -ForegroundColor Yellow
    Write-Host ""
    
    try {
        # Monitor startup
        $startTime = Get-Date
        $maxWaitTime = [TimeSpan]::FromSeconds(30)
        $started = $false
        
        while (-not $started -and ((Get-Date) - $startTime) -lt $maxWaitTime) {
            if (Select-String -Path $mainLog -Pattern "TASKMASTER.*ACTIVE" -Quiet) {
                Write-Host "✨ TaskMaster successfully initialized!" -ForegroundColor Green
                Write-Host "📊 Enhanced position validation active" -ForegroundColor Cyan
                Write-Host "⚖️  Delta-neutral monitoring enabled" -ForegroundColor Cyan
                $started = $true
            }
            Start-Sleep -Seconds 1
        }
        
        if (-not $started) {
            Write-Host "`n⚠️  TaskMaster startup taking longer than expected..." -ForegroundColor Yellow
            Write-Host "   Check logs for details" -ForegroundColor Yellow
        }
        
        # Keep running and show status spinner
        $spinner = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
        $i = 0
        while (-not $taskmaster.HasExited) {
            Write-Host "`r$($spinner[$i % $spinner.Length]) TaskMaster running..." -NoNewline -ForegroundColor Cyan
            Start-Sleep -Milliseconds 100
            $i++
            
            # Every 60 seconds, verify positions
            if ($i % 600 -eq 0) {
                $positionCheck = Start-Process node -ArgumentList "check-positions.cjs" -NoNewWindow -Wait
                if ($positionCheck.ExitCode -ne 0) {
                    Write-Host "`n⚠️  Position check failed!" -ForegroundColor Yellow
                }
            }
        }
        
    } finally {
        if (-not $taskmaster.HasExited) {
            Write-Host "`nStopping TaskMaster..." -ForegroundColor Yellow
            Stop-Process -Id $taskmaster.Id -Force
        }
    }
}

# Start the monitoring script
$job = Start-Job -ScriptBlock $processScript

# Show output in real-time
while ($job.State -eq 'Running') {
    Receive-Job $job
    Start-Sleep -Milliseconds 100
}

# Final cleanup
Receive-Job $job
Remove-Job $job