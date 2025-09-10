#!/usr/bin/env pwsh
# Quick Telegram Reports Status Check

Write-Host ""
Write-Host "📡 TELEGRAM REPORTING STATUS" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Gray

# Check running jobs
$jobs = Get-Job -Name "*telegram*" -ErrorAction SilentlyContinue
if ($jobs) {
    Write-Host "✅ RUNNING" -ForegroundColor Green
    foreach ($job in $jobs) {
        Write-Host "   Job ID: $($job.Id)" -ForegroundColor White
        Write-Host "   State: $($job.State)" -ForegroundColor Green
        Write-Host "   Location: $($job.Location)" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ NOT RUNNING" -ForegroundColor Red
}

# Show recent activity
$logFile = ".logs\telegram-reports.log"
if (Test-Path $logFile) {
    Write-Host ""
    Write-Host "📋 RECENT ACTIVITY:" -ForegroundColor Yellow
    Write-Host "==================" -ForegroundColor Gray
    Get-Content $logFile -Tail 8 | ForEach-Object {
        if ($_ -like "*Enhanced report sent successfully*") {
            Write-Host "   $_" -ForegroundColor Green
        } elseif ($_ -like "*Next report at*") {
            Write-Host "   $_" -ForegroundColor Cyan
        } elseif ($_ -like "*failed*" -or $_ -like "*ERROR*") {
            Write-Host "   $_" -ForegroundColor Red
        } else {
            Write-Host "   $_" -ForegroundColor White
        }
    }
} else {
    Write-Host ""
    Write-Host "⚠️ No log file found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔧 CONTROLS:" -ForegroundColor Cyan
Write-Host "============" -ForegroundColor Gray
Write-Host "   .\start-telegram-reports.ps1 start    # Start reporting" -ForegroundColor Gray
Write-Host "   .\start-telegram-reports.ps1 stop     # Stop reporting" -ForegroundColor Gray
Write-Host "   .\start-telegram-reports.ps1 restart  # Restart reporting" -ForegroundColor Gray
Write-Host ""
