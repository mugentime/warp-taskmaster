# 📁 TASKMASTER PROJECT STRUCTURE

## 🎯 **FOR NEW WARP AI INSTANCES - READ THIS!**

This folder contains many files, but here's what matters:

---

## 📖 **START HERE - ESSENTIAL FILES**

```
📄 README-WARP-AI.md          ← READ THIS FIRST! Complete system overview
🔍 SYSTEM-STATUS.js           ← Run this to check system status  
📊 PROJECT-STRUCTURE.md       ← This file - explains all folders/files
⚙️ .env                       ← Configuration (API keys, Telegram)
```

**Quick Start Command:**
```powershell
node SYSTEM-STATUS.js
```

---

## 🏗️ **CORE SYSTEM FILES** 

### **🚀 TaskMaster Engine (Main System)**
```
backend/core/
├── master-automation.js      ← MAIN ENGINE - runs 24/7
└── (this is the heart of the system)
```

### **📱 PM2 Services**
```  
backend/
├── server-minimal.js         ← Backend API
├── telegram-bot-fixed.js     ← Telegram bridge
└── periodic-telegram-reporter.js ← 10min reports
```

### **🛠️ Essential Tools**
```
backend/
├── quick-position-check.js   ← Check current positions
├── check-real-balance.js     ← Check portfolio balance  
├── find-best-opportunities.js ← Scan for best trades
└── send-update-now.js        ← Manual Telegram update
```

---

## 📁 **FOLDER STRUCTURE EXPLAINED**

### **`backend/core/`** - Main System
- `master-automation.js` - THE main engine (runs continuously)

### **`backend/scripts/`** - System Control
- `start-master-engine.js` - Start/stop TaskMaster
- `stop-master-engine.js` - Stop TaskMaster

### **`backend/utils/`** - Helper Functions
- Balance checking utilities
- Portfolio analysis tools

### **`backend/legacy/`** - Old Versions
- Previous versions (ignore these)
- Historical reference only

### **`backend/data/`** - System Data
- `logs/` - System logs
- `snapshots/` - Portfolio snapshots

---

## ⚡ **QUICK COMMANDS FOR WARP AI**

### **System Status:**
```powershell
node SYSTEM-STATUS.js                           # Overall status
node backend/scripts/start-master-engine.js status  # TaskMaster status  
pm2 status                                      # PM2 services
```

### **Performance Check:**
```powershell
node backend/quick-position-check.js            # Current positions
node backend/check-real-balance.js              # Portfolio balance
node backend/find-best-opportunities.js         # Best opportunities
```

### **Telegram:**
```powershell  
node backend/send-update-now.js                 # Send update now
pm2 restart telegram-reporter                   # Restart reports
```

### **Manual Control:**
```powershell
node backend/force-deploy-now.js                # Force deploy capital
node backend/deploy-100-percent.js              # Use 100% capital
```

---

## 🚨 **FILES TO IGNORE**

**❌ Don't worry about these:**
```
*.md files (except README-WARP-AI.md)
backend/legacy/ folder
Old bot scripts  
Test files
Workflow files
```

**❌ Don't run these as "bots":**
- Individual .js files in root
- Scripts in legacy/
- Test/debug files

---

## ✅ **SUCCESS CHECKLIST**

**New Warp instance should verify:**
- [ ] `node SYSTEM-STATUS.js` shows TaskMaster running
- [ ] PM2 shows 3 services online
- [ ] Portfolio utilization >90%  
- [ ] Telegram reports working
- [ ] Daily ROI >0.5%

---

## 🎯 **REMEMBER:**

1. **This is ONE unified system**, not multiple bots
2. **TaskMaster engine** manages everything automatically  
3. **Manual tools** are for checking/fixing, not running constantly
4. **Goal is funding rate arbitrage**, not directional trading
5. **System should run 24/7** in background

---

## 📞 **NEED HELP?**

**Check in this order:**
1. Run `node SYSTEM-STATUS.js`
2. Read `README-WARP-AI.md`
3. Check specific issues with individual tools
4. Use troubleshooting section in README

**Common Issues:**
- Low utilization → `node backend/deploy-100-percent.js`
- No Telegram → `pm2 restart telegram-reporter`  
- TaskMaster stopped → `node backend/scripts/start-master-engine.js start`

---

**🎯 KEY POINT: This is a PORTFOLIO MANAGEMENT SYSTEM with one master engine, not individual trading bots!**
