# 🚀 PORTABLE TASKMASTER SETUP

## 📦 MAKING IT FULLY PORTABLE

### Step 1: Download Portable Node.js
1. Go to: https://nodejs.org/en/download/
2. Download "Windows Binary (.zip)" - NOT the installer
3. Extract to `warp-taskmaster/nodejs/` folder
4. Your structure: `warp-taskmaster/nodejs/node.exe`

### Step 2: Create Launch Script
Create `start-taskmaster.bat`:
```batch
@echo off
echo 🚀 Starting TaskMaster Unified Autopilot...
cd /d "%~dp0"
nodejs\node.exe taskmaster-unified.cjs
pause
```

### Step 3: USB Deployment
```
📁 USB Drive/
├── 📁 warp-taskmaster/
│   ├── 📁 nodejs/           ← Portable Node.js runtime
│   ├── 📁 node_modules/     ← Dependencies (already included)
│   ├── 📄 taskmaster-unified.cjs
│   ├── 📄 .env              ← API keys (already included)
│   ├── 📄 package.json      ← Config (already included)
│   └── 📄 start-taskmaster.bat ← Easy launcher
```

## 🎯 ON ANY WINDOWS COMPUTER:

1. Insert USB drive
2. Double-click `start-taskmaster.bat`
3. System launches immediately - NO SETUP REQUIRED!

## ⚡ CURRENT FOLDER SIZE:
- Source code: ~50MB
- Node.js portable: ~50MB  
- Dependencies: ~200MB
- **Total: ~300MB** (fits on any USB)

## 🔒 SECURITY NOTES:
- API keys travel with the folder (.env file)
- Same trading account accessible from any computer
- Consider using different API keys for different computers
