@echo off
echo 🚀 TASKMASTER UNIFIED AUTOPILOT - SAFE LAUNCHER
echo ═══════════════════════════════════════════════

:: Check for existing TaskMaster instances
echo 🔍 Checking for existing TaskMaster instances...
tasklist | find /i "node.exe" > nul
if %errorlevel% == 0 (
    echo ⚠️ WARNING: Node.js processes detected!
    echo.
    echo This could mean TaskMaster is already running somewhere.
    echo Running multiple instances will cause trading conflicts.
    echo.
    choice /C YN /M "Are you sure you want to continue? (Y/N)"
    if errorlevel 2 (
        echo ❌ Launch cancelled for safety.
        pause
        exit /b
    )
)

echo ✅ Safe to proceed

:: Check for Node.js
echo 🔍 Checking for Node.js runtime...
if exist "nodejs\node.exe" (
    echo ✅ Using portable Node.js
    set NODE_EXEC=nodejs\node.exe
) else (
    node --version >nul 2>&1
    if %errorlevel% == 0 (
        echo ✅ Using system Node.js
        set NODE_EXEC=node
    ) else (
        echo ❌ Node.js not found!
        echo Please install Node.js or add portable version to nodejs\ folder
        pause
        exit /b
    )
)

:: Launch TaskMaster
echo 🚀 Starting TaskMaster MCP...
echo ⏰ System will run continuously until stopped
echo 📱 Check Telegram for status updates
echo.

cd /d "%~dp0"
%NODE_EXEC% taskmaster-unified.cjs

echo.
echo 🛑 TaskMaster has stopped.
pause
