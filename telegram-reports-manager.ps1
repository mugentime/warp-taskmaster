#!/usr/bin/env pwsh
# Simple Telegram Reports Manager - Every 10 Minutes
# Manages Telegram reporting system with background jobs

param(
    [string]$Action = "start",
    [switch]$Force,
    [switch]$Status,
    [switch]$Stop
)

# Configuration
$REPORT_INTERVAL_MINUTES = 10
$PROJECT_ROOT = Get-Location
$LOG_FILE = Join-Path $PROJECT_ROOT ".logs\telegram-reports.log"
$STATUS_FILE = Join-Path $PROJECT_ROOT ".runtime\telegram-status.json"

# Ensure directories exist
New-Item -ItemType Directory -Path (Split-Path $LOG_FILE) -Force | Out-Null
New-Item -ItemType Directory -Path (Split-Path $STATUS_FILE) -Force | Out-Null

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    Write-Host $logEntry
    Add-Content -Path $LOG_FILE -Value $logEntry -ErrorAction SilentlyContinue
}

function Test-TelegramSetup {
    Write-Log "🔍 Checking Telegram setup..."
    
    $envFile = Join-Path $PROJECT_ROOT "backend\.env"
    if (-not (Test-Path $envFile)) {
        Write-Log "❌ .env file not found in backend directory"
        return $false
    }
    
    $envContent = Get-Content $envFile -Raw -ErrorAction SilentlyContinue
    if (-not $envContent) {
        Write-Log "❌ Could not read .env file"
        return $false
    }
    
    $hasToken = $envContent -match "TELEGRAM_BOT_TOKEN=.+"
    $hasChatId = $envContent -match "TELEGRAM_CHAT_ID=.+"
    
    if (-not $hasToken -or -not $hasChatId) {
        Write-Log "❌ Telegram credentials not properly configured"
        return $false
    }
    
    Write-Log "✅ Telegram configuration looks good"
    return $true
}

function Stop-TelegramReporting {
    Write-Log "🛑 Stopping Telegram reporting system..."
    
    # Stop background jobs
    Get-Job -Name "*telegram*" -ErrorAction SilentlyContinue | Stop-Job -PassThru | Remove-Job
    
    # Update status
    $status = @{
        running = $false
        stopped_at = (Get-Date).ToString("s")
        next_run = $null
    }
    $status | ConvertTo-Json | Set-Content $STATUS_FILE
    
    Write-Log "🛑 Telegram reporting system stopped"
}

function Start-TelegramReporting {
    Write-Log "🚀 Starting Telegram reporting system (every $REPORT_INTERVAL_MINUTES minutes)..."
    
    if (-not (Test-TelegramSetup)) {
        Write-Log "❌ Cannot start: Configuration issues detected"
        return $false
    }
    
    # Create background job for reporting
    $job = Start-Job -Name "TelegramReports" -ScriptBlock {
        param($ProjectPath, $IntervalMinutes, $LogPath)
        
        Set-Location $ProjectPath
        
        while ($true) {
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            
            try {
                Add-Content -Path $LogPath -Value "[$timestamp] [JOB] 📊 Generating Telegram report..."
                
                # Run the enhanced reporter
                $result = & node enhanced-telegram-reporter.js 2>&1
                
                Add-Content -Path $LogPath -Value "[$timestamp] [JOB] ✅ Report completed: $result"
                
            } catch {
                Add-Content -Path $LogPath -Value "[$timestamp] [JOB] ❌ Report failed: $($_.Exception.Message)"
            }
            
            $nextTime = (Get-Date).AddMinutes($IntervalMinutes).ToString('HH:mm:ss')
            Add-Content -Path $LogPath -Value "[$timestamp] [JOB] ⏰ Next report at: $nextTime"
            
            Start-Sleep -Seconds ($IntervalMinutes * 60)
        }
    } -ArgumentList $PROJECT_ROOT, $REPORT_INTERVAL_MINUTES, $LOG_FILE
    
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
        try {
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
            } else {
                Write-Host "❌ NO" -ForegroundColor Red
                Write-Host "🛑 Stopped: $($status.stopped_at)"
            }
        } catch {
            Write-Host "❌ Could not read status file" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ System not initialized" -ForegroundColor Red
    }
    
    # Show recent logs
    if (Test-Path $LOG_FILE) {
        Write-Host "`n📋 RECENT LOGS:" -ForegroundColor Yellow
        Write-Host "-" * 30 -ForegroundColor Gray
        try {
            Get-Content $LOG_FILE -Tail 5 | ForEach-Object {
                Write-Host "   $_" -ForegroundColor White
            }
        } catch {
            Write-Host "   Could not read log file" -ForegroundColor Red
        }
    }
    
    # Test configuration
    Write-Host "`n🔧 CONFIGURATION CHECK:" -ForegroundColor Yellow
    Write-Host "-" * 30 -ForegroundColor Gray
    $configOk = Test-TelegramSetup
    if ($configOk) {
        Write-Host "   ✅ Telegram configuration: OK" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Telegram configuration: ISSUES" -ForegroundColor Red
    }
}

function Test-TelegramConnection {
    Write-Host "`n🧪 Testing Telegram connection..." -ForegroundColor Yellow
    
    try {
        $result = & node enhanced-telegram-reporter.js --test
        Write-Host "✅ Test completed successfully" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main execution
Write-Host "`n📡 TELEGRAM REPORTS MANAGER" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray

switch ($Action.ToLower()) {
    "start" {
        if ($Force) {
            Stop-TelegramReporting
            Start-Sleep -Seconds 1
        }
        Start-TelegramReporting
    }
    "stop" { 
        Stop-TelegramReporting 
    }
    "restart" { 
        Stop-TelegramReporting
        Start-Sleep -Seconds 2
        Start-TelegramReporting
    }
    "test" {
        Test-TelegramConnection
    }
    default { 
        Show-Status 
    }
}

if ($Status) { Show-Status }
if ($Stop) { Stop-TelegramReporting }

Write-Host "`n💡 Usage examples:" -ForegroundColor Cyan
Write-Host "   .\telegram-reports-manager.ps1 start     # Start reporting every 10 min" -ForegroundColor Gray
Write-Host "   .\telegram-reports-manager.ps1 stop      # Stop reporting" -ForegroundColor Gray  
Write-Host "   .\telegram-reports-manager.ps1 restart   # Restart reporting" -ForegroundColor Gray
Write-Host "   .\telegram-reports-manager.ps1 status    # Show status" -ForegroundColor Gray
Write-Host "   .\telegram-reports-manager.ps1 test      # Test Telegram connection" -ForegroundColor Gray
Write-Host "   .\telegram-reports-manager.ps1 -Force    # Force restart" -ForegroundColor Gray
