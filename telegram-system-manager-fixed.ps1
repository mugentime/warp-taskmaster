#!/usr/bin/env pwsh
# Complete Telegram System Manager (Fixed)
# Manages both reporting system and bot server

param(
    [string]$Action = "status",
    [switch]$Start,
    [switch]$Stop,
    [switch]$Restart
)

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host $Title -ForegroundColor Cyan
    Write-Host ("=" * $Title.Length) -ForegroundColor Gray
}

function Write-StatusLine {
    param([string]$Label, [string]$Value, [string]$Color = "White")
    Write-Host "  $Label" -NoNewline -ForegroundColor Gray
    Write-Host $Value -ForegroundColor $Color
}

function Test-TelegramConnection {
    Write-Host "  Testing Telegram connection..." -ForegroundColor Yellow
    try {
        Set-Location backend
        $result = node send-telegram-test.js 2>&1
        Set-Location ..
        if ($result -like "*Message sent successfully*") {
            Write-StatusLine "Connection Test: " "✅ PASSED" "Green"
            return $true
        } else {
            Write-StatusLine "Connection Test: " "❌ FAILED" "Red"
            Write-Host "    $result" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-StatusLine "Connection Test: " "❌ ERROR" "Red"
        Write-Host "    $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Start-TelegramSystem {
Write-Header "STARTING TELEGRAM SYSTEM"
    # Start reporting system
    Write-Host "1. Starting Telegram Reports (every 10 minutes)..."
    try {
        $existingReports = Get-Job -Name "*TelegramReports*" -ErrorAction SilentlyContinue
        if ($existingReports) { $existingReports | Stop-Job -PassThru | Remove-Job -Force }
        $reportsJob = Start-Job -Name "TelegramReports" -ScriptBlock {
            param($ProjectPath)
            Set-Location $ProjectPath
            while ($true) {
                try {
                    $null = & node telegram-final.cjs 2>&1
                    Write-Output "Report sent at $(Get-Date -Format 'HH:mm:ss')"
                } catch {
                    Set-Location "backend"
                    $null = & node balance-notifications.js --test 2>&1
                    Set-Location $ProjectPath
                    Write-Output "Fallback report sent at $(Get-Date -Format 'HH:mm:ss')"
                }
                Start-Sleep -Seconds 600
            }
        } -ArgumentList (Get-Location)
        Write-StatusLine "Reports System: " "✅ STARTED (Job ID: $($reportsJob.Id))" "Green"
    } catch {
        Write-StatusLine "Reports System: " "❌ FAILED TO START" "Red"
    }
    # Start bot server
    Write-Host "2. Starting Telegram Bot Server (command listener)..."
    try {
        $existingBot = Get-Job -Name "*TelegramBot*" -ErrorAction SilentlyContinue
        if ($existingBot) { $existingBot | Stop-Job -PassThru | Remove-Job -Force }
        $botJob = Start-Job -Name "TelegramBotServer" -ScriptBlock {
            Set-Location "C:\Users\je2al\Desktop\aplicaciones de trading\gemini binance futures\warp-taskmaster\backend"
            node telegram-bot-simple.js
        }
        Write-StatusLine "Bot Server: " "✅ STARTED (Job ID: $($botJob.Id))" "Green"
    } catch {
        Write-StatusLine "Bot Server: " "❌ FAILED TO START" "Red"
    }
    Start-Sleep -Seconds 2
    # Test connection
    Write-Host "3. Testing system..."
    $null = Test-TelegramConnection
}

function Stop-TelegramSystem {
Write-Header "STOPPING TELEGRAM SYSTEM"
    $stopped = 0
    $telegramJobs = Get-Job -Name "*Telegram*" -ErrorAction SilentlyContinue
    foreach ($job in $telegramJobs) {
        try {
            Stop-Job -Job $job -PassThru | Remove-Job -Force
            Write-StatusLine "$($job.Name): " "✅ STOPPED" "Green"
            $stopped++
        } catch {
            Write-StatusLine "$($job.Name): " "❌ FAILED TO STOP" "Red"
        }
    }
    if ($stopped -eq 0) {
        Write-StatusLine "Result: " "⚠️ NO JOBS WERE RUNNING" "Yellow"
    } else {
        Write-StatusLine "Result: " "✅ STOPPED $stopped JOB(S)" "Green"
    }
}

function ShowTelegramStatus {
    Write-Header "TELEGRAM SYSTEM STATUS"
    $telegramJobs = Get-Job -Name "*Telegram*" -ErrorAction SilentlyContinue
    if (-not $telegramJobs -or $telegramJobs.Count -eq 0) {
        Write-StatusLine "System Status: " "❌ NOT RUNNING" "Red"
        Write-Host ""
        Write-Host "💡 To start: .\telegram-system-manager-fixed.ps1 -Start" -ForegroundColor Cyan
        return
    }
    foreach ($job in $telegramJobs) {
        $status = if ($job.State -eq "Running") { "✅ RUNNING" } else { "❌ $($job.State.ToUpper())" }
        $color = if ($job.State -eq "Running") { "Green" } else { "Red" }
        Write-StatusLine "$($job.Name): " $status $color
        Write-StatusLine "  Job ID: " $job.Id "White"
        Write-StatusLine "  State: " $job.State "White"
    }
    Write-Host ""
    Write-Header "RECENT ACTIVITY"
    $reportsLog = ".logs\telegram-reports.log"
    if (Test-Path $reportsLog) {
Write-Host "Reports System:" -ForegroundColor Yellow
        Get-Content $reportsLog -Tail 3 | ForEach-Object {
            if ($_ -like "*Enhanced report sent successfully*") {
                Write-Host "    $_" -ForegroundColor Green
            } elseif ($_ -like "*failed*") {
                Write-Host "    $_" -ForegroundColor Red
            } else {
                Write-Host "    $_" -ForegroundColor White
            }
        }
    }
    Write-Host ""
    Write-Host "🤖 Bot Server:" -ForegroundColor Yellow
    $botJob = Get-Job -Name "*TelegramBot*" -ErrorAction SilentlyContinue
    if ($botJob) {
        $output = Receive-Job -Job $botJob -Keep | Select-Object -Last 5
        if ($output) {
            $output | ForEach-Object {
                if ($_ -like "*Command processed*") {
                    Write-Host "    $_" -ForegroundColor Green
                } elseif ($_ -like "*error*") {
                    Write-Host "    $_" -ForegroundColor Red
                } else {
                    Write-Host "    $_" -ForegroundColor White
                }
            }
        } else {
            Write-Host "    No recent activity" -ForegroundColor Gray
        }
    }
    Write-Host ""
    Write-Header "CONNECTION TEST"
    $null = Test-TelegramConnection
}

# Main execution
Write-Host ""
Write-Host "TELEGRAM SYSTEM MANAGER (FIXED)" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Gray

if ($Start -or $Action -eq "start") {
    Start-TelegramSystem
} elseif ($Stop -or $Action -eq "stop") {
    Stop-TelegramSystem
} elseif ($Restart -or $Action -eq "restart") {
    Stop-TelegramSystem
    Start-Sleep -Seconds 2
    Start-TelegramSystem
} else {
    ShowTelegramStatus
}

Write-Host ""
Write-Host "USAGE:" -ForegroundColor Cyan
Write-Host "=========" -ForegroundColor Gray
Write-Host "  .\telegram-system-manager-fixed.ps1          # Show status" -ForegroundColor Gray
Write-Host "  .\telegram-system-manager-fixed.ps1 -Start   # Start both systems" -ForegroundColor Gray
Write-Host "  .\telegram-system-manager-fixed.ps1 -Stop    # Stop both systems" -ForegroundColor Gray
Write-Host "  .\telegram-system-manager-fixed.ps1 -Restart # Restart both systems" -ForegroundColor Gray
Write-Host ""
Write-Host "BOT COMMANDS (send to your bot):" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Gray
Write-Host "  /portfolio  - View your trading bots" -ForegroundColor White
Write-Host "  /roi        - See profit projections" -ForegroundColor White
Write-Host "  /status     - System status" -ForegroundColor White
Write-Host "  /help       - All available commands" -ForegroundColor White
Write-Host ""
