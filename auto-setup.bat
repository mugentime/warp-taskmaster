@echo off
echo 🔍 Checking for Node.js...

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Node.js found! Starting TaskMaster...
    node taskmaster-unified.cjs
) else (
    echo ❌ Node.js not found!
    echo 📥 Please install Node.js first:
    echo.
    echo 1. Go to: https://nodejs.org/
    echo 2. Download and install Node.js LTS
    echo 3. Restart this script
    echo.
    echo OR
    echo.
    echo 🚀 Use portable version (see PORTABLE-SETUP.md)
)

pause
