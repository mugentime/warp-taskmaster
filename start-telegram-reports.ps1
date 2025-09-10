#!/usr/bin/env pwsh
# Simple Telegram Reports Manager - Every 10 Minutes

param(
    [string]$Action = "start",
    [switch]$Stop
)

$INTERVAL_MINUTES = 10
$LOG_FILE = ".logs\telegram-reports.log"

# Ensure log directory exists
New-Item -ItemType Directory -Path ".logs" -Force | Out-Null

function Write-LogMessage {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    Write-Host $logEntry
    Add-Content -Path $LOG_FILE -Value $logEntry -ErrorAction SilentlyContinue
}

function Stop-TelegramReports {
    Write-LogMessage "Stopping Telegram reporting..."
    Get-Job -Name "*telegram*" -ErrorAction SilentlyContinue | Stop-Job -PassThru | Remove-Job -Force
    Write-LogMessage "Telegram reporting stopped"
}

function Start-TelegramReports {
    Write-LogMessage "Starting Telegram reporting system (every $INTERVAL_MINUTES minutes)..."
    
    $job = Start-Job -Name "TelegramReports" -ScriptBlock {
        param($ProjectPath, $IntervalMinutes, $LogPath)
        Set-Location $ProjectPath
        
        while ($true) {
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            
            try {
                Add-Content -Path $LogPath -Value "[$timestamp] [JOB] Generating trading report..."
                
                # First try the enhanced reporter, fallback to basic reporter
                try {
                    $result = & node enhanced-telegram-reporter.js 2>&1
                    Add-Content -Path $LogPath -Value "[$timestamp] [JOB] Enhanced report sent successfully"
                } catch {
                    # Fallback to balance notifications
                    Set-Location "backend"
                    $result = & node balance-notifications.js --test 2>&1
                    Set-Location $ProjectPath
                    Add-Content -Path $LogPath -Value "[$timestamp] [JOB] Fallback report sent: $result"
                }
                
            } catch {
                Add-Content -Path $LogPath -Value "[$timestamp] [JOB] Report failed: $($_.Exception.Message)"
            }
            
            $nextTime = (Get-Date).AddMinutes($IntervalMinutes).ToString('HH:mm:ss')
            Add-Content -Path $LogPath -Value "[$timestamp] [JOB] Next report at: $nextTime"
            
            Start-Sleep -Seconds ($IntervalMinutes * 60)
        }
    } -ArgumentList (Get-Location), $INTERVAL_MINUTES, $LOG_FILE
    
    $nextRun = (Get-Date).AddMinutes($INTERVAL_MINUTES).ToString('HH:mm:ss')
    Write-LogMessage "Telegram reporting started successfully!"
    Write-LogMessage "Next report at: $nextRun"
    Write-LogMessage "Job ID: $($job.Id)"
}

function Show-Status {
    Write-Host ""
    Write-Host "TELEGRAM REPORTING STATUS" -ForegroundColor Cyan
    Write-Host "=========================" -ForegroundColor Gray
    
    $jobs = Get-Job -Name "*telegram*" -ErrorAction SilentlyContinue
    if ($jobs) {
        foreach ($job in $jobs) {
            Write-Host "Job ID: $($job.Id) - State: $($job.State)" -ForegroundColor Green
        }
    } else {
        Write-Host "No Telegram reporting jobs running" -ForegroundColor Red
    }
    
    if (Test-Path $LOG_FILE) {
        Write-Host ""
        Write-Host "RECENT LOGS:" -ForegroundColor Yellow
        Get-Content $LOG_FILE -Tail 5 | ForEach-Object {
            Write-Host "  $_" -ForegroundColor White
        }
    }
}

# Main execution
Write-Host ""
Write-Host "TELEGRAM REPORTS MANAGER" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Gray

if ($Stop) {
    Stop-TelegramReports
} elseif ($Action -eq "stop") {
    Stop-TelegramReports
} elseif ($Action -eq "restart") {
    Stop-TelegramReports
    Start-Sleep -Seconds 2
    Start-TelegramReports
} elseif ($Action -eq "start") {
    # Stop any existing jobs first
    Stop-TelegramReports
    Start-Sleep -Seconds 1
    Start-TelegramReports
} else {
    Show-Status
}

Write-Host ""
Write-Host "Usage:" -ForegroundColor Cyan
Write-Host "  .\start-telegram-reports.ps1 start    # Start reporting" -ForegroundColor Gray
Write-Host "  .\start-telegram-reports.ps1 stop     # Stop reporting" -ForegroundColor Gray
Write-Host "  .\start-telegram-reports.ps1 restart  # Restart reporting" -ForegroundColor Gray
Write-Host "  .\start-telegram-reports.ps1          # Show status" -ForegroundColor Gray
