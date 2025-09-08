# Desktop Commander

Desktop Commander is a workspace management system designed to orchestrate your trading application development environment. It provides automated window positioning, service management, and workspace switching for optimal productivity.

## 🚀 Quick Start

### Initialize Desktop Commander
```powershell
# Option 1: Using npm script
npm run desktop:init

# Option 2: Direct PowerShell
.\desktop-commander-init.ps1
```

### Start Your Trading Workspace
```powershell
# Using npm script
npm run desktop:start:trading

# Using PowerShell directly
.\desktop-commander.ps1 /start -Workspace trading
```

### Check Status
```powershell
npm run desktop:status
```

## 📋 Available Commands

### Core Commands
| Command | Description | Example |
|---------|-------------|---------|
| `/init` | Initialize Desktop Commander | `.\desktop-commander.ps1 /init` |
| `/start` | Start a workspace | `.\desktop-commander.ps1 /start -Workspace trading` |
| `/stop` | Stop current workspace | `.\desktop-commander.ps1 /stop` |
| `/status` | Show system status | `.\desktop-commander.ps1 /status` |
| `/restart-services` | Restart all services | `.\desktop-commander.ps1 /restart-services` |
| `/help` | Show all commands | `.\desktop-commander.ps1 /help` |

### NPM Scripts
| Script | Description |
|--------|-------------|
| `npm run desktop:init` | Initialize Desktop Commander |
| `npm run desktop:start:trading` | Start trading workspace |
| `npm run desktop:start:development` | Start development workspace |
| `npm run desktop:start:monitoring` | Start monitoring workspace |
| `npm run desktop:stop` | Stop current workspace |
| `npm run desktop:status` | Show status |
| `npm run desktop:restart-services` | Restart services |

## 🖥️ Workspaces

### Trading Workspace
**Purpose**: Primary trading environment
**Components**:
- Frontend application (http://localhost:4173)
- Backend server console
- Taskmaster console for quick commands

**Window Layout**:
```
┌─────────────────────┬──────────────┐
│                     │   Backend    │
│     Frontend        │   Console    │
│   (1280x720)        │  (640x360)   │
│                     ├──────────────┤
│                     │ Taskmaster   │
│                     │   Console    │
│                     │  (640x360)   │
└─────────────────────┴──────────────┘
```

### Development Workspace
**Purpose**: Code development and testing
**Components**:
- VS Code (full screen primary monitor)
- Test browser (secondary monitor)
- Playwright test runner (secondary monitor)

### Monitoring Workspace
**Purpose**: System monitoring and logs
**Components**:
- System performance monitor
- Backend logs viewer
- Network activity monitor

## ⚙️ Configuration

### Configuration File
Desktop Commander uses `desktop-commander.config.json` for configuration:

```json
{
  "workspaces": {
    "trading": {
      "description": "Primary trading workspace setup",
      "windows": [...]
    }
  },
  "services": {
    "backend": {
      "name": "Backend Server",
      "command": "node backend/server.js",
      "port": 3001,
      "healthCheck": "http://localhost:3001/api/v1/test"
    }
  }
}
```

### Customizing Workspaces
1. Edit `desktop-commander.config.json`
2. Add or modify workspace definitions
3. Specify window positions and sizes
4. Define service dependencies

## 🔧 Integration with Taskmaster

Desktop Commander works seamlessly with the existing Taskmaster workflow:

### Combined Usage Examples
```powershell
# Start desktop environment
npm run desktop:start:trading

# Run Taskmaster commands
.\taskmaster-commands.ps1 /status
.\taskmaster-commands.ps1 /test-connection

# Check both systems
npm run desktop:status
.\taskmaster-commands.ps1 /status
```

### Service Coordination
- Desktop Commander starts services in background (per user rules)
- Taskmaster provides testing and validation commands  
- Both systems share service health monitoring

## 🎯 Features

### Automatic Service Management
- **Background Execution**: All services start in background (following user rules)
- **Health Monitoring**: Continuous service health checks
- **Auto-restart**: Failed services can be automatically restarted

### Window Positioning
- **Precise Layouts**: Pixel-perfect window positioning
- **Multi-monitor Support**: Workspace distribution across monitors
- **Process Management**: Automatic window sizing for different applications

### Workspace Switching
- **Quick Commands**: Rapid workspace switching
- **Service Preservation**: Services continue running during switches
- **State Management**: Remember workspace configurations

### Logging and Monitoring
- **Activity Logging**: All operations logged to `logs/desktop-commander.log`
- **Service Health**: Real-time health status for all services
- **Error Tracking**: Detailed error reporting and troubleshooting

## 🔍 Troubleshooting

### Common Issues

#### "Configuration file not found"
```powershell
# Ensure you're in the correct directory
cd "C:\Users\je2al\Desktop\aplicaciones de trading\gemini binance futures\warp-taskmaster"

# Verify files exist
ls desktop-commander*
```

#### "Service health check failed"
```powershell
# Check if services are running
.\desktop-commander.ps1 /status

# Manually restart services
.\desktop-commander.ps1 /restart-services

# Check Taskmaster status
.\taskmaster-commands.ps1 /status
```

#### "Window positioning not working"
- Ensure applications are fully started before positioning
- Check if process names match configuration
- Verify monitor configuration for multi-monitor setups

### Log Files
Desktop Commander logs all activities to:
- `logs/desktop-commander.log` - Main activity log
- Console output with color-coded status messages

## 🚀 Advanced Usage

### Creating Custom Workspaces
1. Define new workspace in `desktop-commander.config.json`
2. Add npm script in `package.json`
3. Test with `.\desktop-commander.ps1 /start -Workspace <name>`

### Environment Variables
Set in configuration or system environment:
```json
{
  "environment": {
    "NODE_ENV": "development",
    "DESKTOP_COMMANDER_ACTIVE": "true",
    "AUTO_START_SERVICES": true,
    "LOG_LEVEL": "info"
  }
}
```

### Integration with Other Tools
Desktop Commander can integrate with:
- Task schedulers for automated startup
- Monitoring tools for system health
- CI/CD pipelines for development workflows

## 📚 API Reference

### PowerShell Functions
- `Start-Workspace($WorkspaceName)` - Launch a workspace
- `Stop-Workspace()` - Stop current workspace  
- `Get-WorkspaceStatus()` - Get system status
- `Set-WindowPosition($ProcessName, $X, $Y, $Width, $Height)` - Position windows

### Configuration Schema
See `desktop-commander.config.json` for complete schema with:
- Workspace definitions
- Window configurations
- Service specifications
- Environment settings

## 🤝 Integration Examples

### Startup Sequence
```powershell
# 1. Initialize environment
npm run desktop:init

# 2. Start trading workspace
npm run desktop:start:trading

# 3. Verify all systems
npm run desktop:status
.\taskmaster-commands.ps1 /status

# 4. Run tests
.\taskmaster-commands.ps1 /test-connection
```

### Development Workflow
```powershell
# Switch to development workspace
npm run desktop:start:development

# Run full test suite
.\taskmaster-commands.ps1 /full-test

# Switch back to trading
npm run desktop:start:trading
```

---

*Desktop Commander - Orchestrating your trading development environment* 🖥️✨
