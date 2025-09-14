#!/usr/bin/env pwsh
# Telegram Trading Report Manager - Every 10 Minutes
# Restarts and manages Telegram reporting system with automatic recovery

param(
    [string]$Action = "start",
    [switch]$Force,
    [switch]$Status,
    [switch]$Stop
)

# Configuration
$REPORT_INTERVAL_MINUTES = 10
$PROJECT_ROOT = Get-Location
$BACKEND_PATH = Join-Path $PROJECT_ROOT "backend"
$NODE_SCRIPT = "balance-notifications.js"
$REPORT_SCRIPT = "generate-trading-report.js"
$PID_FILE = Join-Path $PROJECT_ROOT ".runtime\telegram-reports.pid"
$LOG_FILE = Join-Path $PROJECT_ROOT ".logs\telegram-reports.log"
$STATUS_FILE = Join-Path $PROJECT_ROOT ".runtime\telegram-status.json"

# Ensure directories exist
New-Item -ItemType Directory -Path (Split-Path $PID_FILE) -Force | Out-Null
New-Item -ItemType Directory -Path (Split-Path $LOG_FILE) -Force | Out-Null

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Write-Host $logEntry
    Add-Content -Path $LOG_FILE -Value $logEntry
}

function Test-TelegramConfig {
    Write-Log "🔍 Checking Telegram configuration..."
    
    $envFile = Join-Path $BACKEND_PATH ".env"
    if (-not (Test-Path $envFile)) {
        Write-Log "❌ .env file not found in backend directory" "ERROR"
        return $false
    }
    
    $envContent = Get-Content $envFile -Raw
    $hasToken = $envContent -match "TELEGRAM_BOT_TOKEN=.+"
    $hasChatId = $envContent -match "TELEGRAM_CHAT_ID=.+"
    
    if (-not $hasToken) {
        Write-Log "❌ TELEGRAM_BOT_TOKEN not configured" "ERROR"
        return $false
    }
    
    if (-not $hasChatId) {
        Write-Log "❌ TELEGRAM_CHAT_ID not configured" "ERROR"
        return $false
    }
    
    Write-Log "✅ Telegram configuration looks good"
    return $true
}
}

function Test-TelegramConnection {
    Write-Log "🧪 Testing Telegram notifications..."
    
    try {
        Set-Location $BACKEND_PATH
        $testResult = & node $NODE_SCRIPT --test
        Write-Log "✅ Telegram test completed"
        return $true
    } catch {
        Write-Log "❌ Telegram test failed: $($_.Exception.Message)" "ERROR"
        return $false
    } finally {
        Set-Location $PROJECT_ROOT
    }
}

function Stop-TelegramReports {
    Write-Log "🛑 Stopping Telegram reporting system..."
    
    # Stop scheduled task if it exists
    $taskName = "TelegramTradingReports"
    try {
        if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
            Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
            Write-Log "✅ Scheduled task removed"
        }
    } catch {
        Write-Log "⚠️ No scheduled task to remove"
    }
    
    # Stop any background jobs
    Get-Job -Name "*telegram*" -ErrorAction SilentlyContinue | Stop-Job -PassThru | Remove-Job
    
    # Kill processes if PID file exists
    if (Test-Path $PID_FILE) {
        $processIds = Get-Content $PID_FILE -ErrorAction SilentlyContinue
        foreach ($pid in $processIds) {
            try {
                if ($pid -and (Get-Process -Id $pid -ErrorAction SilentlyContinue)) {
                    Stop-Process -Id $pid -Force
                    Write-Log "✅ Stopped process PID: $pid"
                }
            } catch {
                Write-Log "⚠️ Process $pid was already stopped"
            }
        }
        Remove-Item $PID_FILE -Force
    }
    
    # Update status
    $status = @{
        running = $false
        stopped_at = (Get-Date).ToString("s")
        next_run = $null
    }
    $status | ConvertTo-Json | Set-Content $STATUS_FILE
    
    Write-Log "🛑 Telegram reporting system stopped"
}

function Start-TelegramReports {
    Write-Log "🚀 Starting Telegram reporting system (every $REPORT_INTERVAL_MINUTES minutes)..."
    
    # Verify configuration first
    if (-not (Test-TelegramConfig)) {
        Write-Log "❌ Cannot start: Configuration issues detected" "ERROR"
        return $false
    }
    
    # Test connection
    if (-not (Test-TelegramConnection)) {
        Write-Log "❌ Cannot start: Telegram connection failed" "ERROR"
        return $false
    }
    
    # Create the reporting job
    $jobScript = {
        param($ProjectRoot, $BackendPath, $ReportScript, $NodeScript, $LogFile, $IntervalMinutes)
        
        function Write-JobLog {
            param([string]$Message)
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            Add-Content -Path $LogFile -Value "[$timestamp] [JOB] $Message"
        }
        
        Write-JobLog "📡 Telegram reporting job started (every $IntervalMinutes minutes)"
        
        while ($true) {
            try {
                Write-JobLog "📊 Generating trading report..."
                
                # Generate enhanced report
                Set-Location $ProjectRoot
                $reportResult = & node enhanced-telegram-reporter.js 2>&1
                Write-JobLog "✅ Enhanced report sent: $reportResult"
                
                Write-JobLog "✅ Report cycle completed successfully"
                
            } catch {
                Write-JobLog "❌ Report cycle failed: $($_.Exception.Message)"
            }
            
            # Wait for next interval
            $nextRun = (Get-Date).AddMinutes($IntervalMinutes)
            Write-JobLog "⏰ Next report at: $($nextRun.ToString('HH:mm:ss'))"
            
            Start-Sleep -Seconds ($IntervalMinutes * 60)
        }
        }
    }
    }
    
    # Start the background job
    $job = Start-Job -Name "TelegramReports" -ScriptBlock $jobScript -ArgumentList @(
        $PROJECT_ROOT, 
        $BACKEND_PATH, 
        $REPORT_SCRIPT, 
        $NODE_SCRIPT, 
        $LOG_FILE, 
        $REPORT_INTERVAL_MINUTES
    )
    
    # Save job PID
    $job.Id | Set-Content $PID_FILE
    
    # Update status
    $nextRun = (Get-Date).AddMinutes($REPORT_INTERVAL_MINUTES)
    $status = @{
        running = $true
        started_at = (Get-Date).ToString("s")
        next_run = $nextRun.ToString("s")
        job_id = $job.Id
        interval_minutes = $REPORT_INTERVAL_MINUTES
    }
    $status | ConvertTo-Json | Set-Content $STATUS_FILE
    
    Write-Log "✅ Telegram reporting system started successfully"
    Write-Log "📅 Next report at: $($nextRun.ToString('HH:mm:ss'))"
    Write-Log "🆔 Job ID: $($job.Id)"
    
    return $true
}

function Show-Status {
    Write-Host "`n🔍 TELEGRAM REPORTING SYSTEM STATUS" -ForegroundColor Cyan
    Write-Host "=" * 50 -ForegroundColor Gray
    
    if (Test-Path $STATUS_FILE) {
        $status = Get-Content $STATUS_FILE -Raw | ConvertFrom-Json
        
        Write-Host "🔄 Running: " -NoNewline
        if ($status.running) {
            Write-Host "✅ YES" -ForegroundColor Green
            Write-Host "🆔 Job ID: $($status.job_id)"
            Write-Host "📅 Started: $($status.started_at)"
            Write-Host "⏰ Next run: $($status.next_run)"
            Write-Host "⏱️ Interval: $($status.interval_minutes) minutes"
            
            # Check if job is actually running
            $job = Get-Job -Id $status.job_id -ErrorAction SilentlyContinue
            if ($job) {
                Write-Host "💚 Job Status: $($job.State)" -ForegroundColor Green
            } else {
                Write-Host "💔 Job Status: NOT FOUND" -ForegroundColor Red
            }
        }
        } else {
            Write-Host "❌ NO" -ForegroundColor Red
            Write-Host "🛑 Stopped: $($status.stopped_at)"
        }
    }
    } else {
        Write-Host "❌ System not initialized" -ForegroundColor Red
    }
    
    # Show recent logs
    if (Test-Path $LOG_FILE) {
        Write-Host "`n📋 RECENT LOGS:" -ForegroundColor Yellow
        Write-Host "-" * 30 -ForegroundColor Gray
        Get-Content $LOG_FILE -Tail 10 | ForEach-Object {
            Write-Host "   $_" -ForegroundColor White
        }
    }
    
    # Test Telegram config
    Write-Host "`n🔧 CONFIGURATION CHECK:" -ForegroundColor Yellow
    Write-Host "-" * 30 -ForegroundColor Gray
    $configOk = Test-TelegramConfig
    if ($configOk) {
        Write-Host "   ✅ Telegram configuration: OK" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Telegram configuration: ISSUES" -ForegroundColor Red
    }
}

function Restart-TelegramReports {
    Write-Log "🔄 Restarting Telegram reporting system..."
    Stop-TelegramReports
    Start-Sleep -Seconds 2
    Start-TelegramReports
}

# Main execution
switch ($Action.ToLower()) {
    "start" { 
        if ($Force -or -not (Test-Path $STATUS_FILE)) {
            Start-TelegramReports
        } else {
            $status = Get-Content $STATUS_FILE -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($status -and $status.running) {
                Write-Log "⚠️ System already running. Use -Force to restart" "WARNING"
                Show-Status
            } else {
                Start-TelegramReports
            }
        }
    }
    "stop" { Stop-TelegramReports }
    "restart" { Restart-TelegramReports }
    "status" { Show-Status }
    default { Show-Status }
}

# Handle switches
if ($Status) { Show-Status }
if ($Stop) { Stop-TelegramReports }

Write-Host "`n💡 Usage examples:" -ForegroundColor Cyan
Write-Host "   .\restart-telegram-reports.ps1 start     # Start reporting" -ForegroundColor Gray
Write-Host "   .\restart-telegram-reports.ps1 stop      # Stop reporting" -ForegroundColor Gray  
Write-Host "   .\restart-telegram-reports.ps1 restart   # Restart reporting" -ForegroundColor Gray
Write-Host "   .\restart-telegram-reports.ps1 status    # Show status" -ForegroundColor Gray
Write-Host "   .\restart-telegram-reports.ps1 -Force    # Force restart" -ForegroundColor Gray
