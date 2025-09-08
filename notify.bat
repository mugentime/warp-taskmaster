@echo off
setlocal enabledelayedexpansion

REM Quick notification batch script for Warp task completion
REM Usage: notify.bat "Task Name" [status] [message]

set "TASK_NAME=%~1"
set "STATUS=%~2"
set "MESSAGE=%~3"
set "WEBHOOK_URL=http://localhost:3001/webhook/task-complete"

REM Default values
if "%TASK_NAME%"=="" (
    echo ❌ Error: Task name is required
    echo Usage: notify.bat "Task Name" [status] [message]
    echo Example: notify.bat "Build Complete" "success" "All tests passed"
    exit /b 1
)

if "%STATUS%"=="" set "STATUS=success"
if "%MESSAGE%"=="" set "MESSAGE=Task completed"

REM Create JSON payload
set "JSON={"
set "JSON=%JSON%\"task_name\":\"%TASK_NAME%\","
set "JSON=%JSON%\"status\":\"%STATUS%\","
set "JSON=%JSON%\"message\":\"%MESSAGE%\","
set "JSON=%JSON%\"timestamp\":\"%date:~10,4%-%date:~4,2%-%date:~7,2%T%time:~0,8%.000Z\","
set "JSON=%JSON%\"source\":\"warp-batch\""
set "JSON=%JSON%}"

REM Send notification using curl or PowerShell
echo 🔔 Sending notification...
echo 📋 Task: %TASK_NAME%
echo ✅ Status: %STATUS%
echo 💬 Message: %MESSAGE%

REM Try curl first, then PowerShell
curl -s -X POST "%WEBHOOK_URL%" -H "Content-Type: application/json" -d "%JSON%" >nul 2>&1

if %errorlevel%==0 (
    echo ✅ Notification sent via curl
) else (
    REM Fallback to PowerShell
    powershell -Command "try { Invoke-RestMethod -Uri '%WEBHOOK_URL%' -Method POST -Body '%JSON%' -ContentType 'application/json' -TimeoutSec 5 | Out-Null; Write-Host '✅ Notification sent via PowerShell' } catch { Write-Host '❌ Failed to send notification' -ForegroundColor Red; [console]::beep(800,200) }"
)
