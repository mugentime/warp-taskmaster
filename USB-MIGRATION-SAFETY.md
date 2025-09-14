# 🚨 TASKMASTER USB MIGRATION SAFETY PROTOCOL

## ⚠️ CRITICAL WARNING: PREVENT DUAL INSTANCES

TaskMaster is a **continuous autonomous trading system**. Running multiple instances simultaneously will cause:
- Conflicting trades on same account
- Position interference 
- Potential losses from competing systems

## 🛡️ SAFE MIGRATION PROCESS:

### Step 1: STOP Original Instance
```powershell
# On original computer - ALWAYS do this first:
Stop-Process -Name "node" -Force
```
**Verify stopped:** Check task manager - no Node.js processes

### Step 2: USB Transfer
1. Copy entire warp-taskmaster folder to USB
2. Include portable Node.js (see PORTABLE-SETUP.md)
3. Transport to new computer

### Step 3: Start on New Computer
```batch
# Double-click: start-taskmaster.bat
# System will:
✅ Initialize portfolio analysis
✅ Resume autonomous trading
✅ Continue same positions/strategies
```

## 🔄 MCP CONTINUITY FEATURES:

### Data Persistence
- `taskmaster-data/baseline.json` - Portfolio baseline
- `taskmaster-data/analysis-*.json` - Historical performance  
- Position data retrieved fresh from Binance API

### Seamless Resume
```
New PC TaskMaster will:
1. Connect to Binance API (same account)
2. Analyze current positions
3. Resume optimization cycles
4. Continue from where old PC left off
```

## 🎯 MIGRATION SCENARIOS:

### Scenario A: Planned Migration
```
1. Stop TaskMaster on PC1
2. Wait 5 minutes (let final trades settle)
3. Copy to USB and move to PC2  
4. Start TaskMaster on PC2
Result: ✅ Seamless continuity
```

### Scenario B: Emergency Migration
```
1. PC1 crashes/unavailable
2. Start TaskMaster on PC2 immediately
3. System auto-detects current state
4. Resumes trading from current positions
Result: ✅ Minimal disruption (maybe 1-2 missed cycles)
```

### Scenario C: Accidental Dual Launch
```
PC1: TaskMaster running
PC2: TaskMaster starts
Result: 🚨 CONFLICT
Fix: Immediately stop one instance, check positions
```

## 📱 MONITORING DURING MIGRATION:

### Telegram Notifications
```
PC1 stops: "🛑 TASKMASTER STOPPED - [timestamp]"
PC2 starts: "🚀 TASKMASTER STARTED - [timestamp]" 
```

### Position Verification
After migration, check:
- Same number of active positions
- No duplicate orders in Binance
- PnL continuity makes sense

## 🔧 TECHNICAL DETAILS:

### State Recovery
TaskMaster doesn't rely on local state files for trading decisions:
- Positions: Retrieved from Binance API
- Balances: Retrieved from Binance API  
- Opportunities: Calculated from live market data

### Instance Detection
Currently NO built-in protection against dual instances.
**TODO**: Add instance locking mechanism

## 🎯 BEST PRACTICES:

1. **One Active Instance Rule**: Never run multiple TaskMasters
2. **Clean Shutdown**: Always stop gracefully before migration
3. **Verify Migration**: Check Telegram notifications for continuity
4. **Monitor First Hour**: Watch for any unexpected behavior post-migration
