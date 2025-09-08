# ==========================================
# DESKTOP COMMANDER
# ==========================================
# Workspace and window management for trading applications

param(
    [string]$Command = "help",
    [string]$Workspace = "",
    [switch]$Background = $false,
    [switch]$Force = $false
)

# Import required modules
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Configuration
$ConfigFile = "desktop-commander.config.json"
$LogFile = "logs/desktop-commander.log"

# Ensure logs directory exists
if (!(Test-Path "logs")) { New-Item -ItemType Directory -Path "logs" -Force | Out-Null }

# Logging function
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $logEntry
    if ($Level -eq "ERROR") {
        Write-Host $logEntry -ForegroundColor Red
    } elseif ($Level -eq "WARN") {
        Write-Host $logEntry -ForegroundColor Yellow
    } else {
        Write-Host $logEntry -ForegroundColor Green
    }
}

# Load configuration
function Get-Config {
    if (!(Test-Path $ConfigFile)) {
        Write-Log "Configuration file not found: $ConfigFile" "ERROR"
        return $null
    }
    try {
        return Get-Content $ConfigFile | ConvertFrom-Json
    } catch {
        Write-Log "Failed to parse configuration: $($_.Exception.Message)" "ERROR"
        return $null
    }
}

# Window positioning functions
function Set-WindowPosition {
    param(
        [string]$ProcessName,
        [int]$X = 0,
        [int]$Y = 0, 
        [int]$Width = 800,
        [int]$Height = 600
    )
    
    Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public class Win32 {
            [DllImport("user32.dll")]
            public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
            [DllImport("user32.dll")]
            public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
            [DllImport("user32.dll")]
            public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
        }
"@

    try {
        $processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
        foreach ($process in $processes) {
            if ($process.MainWindowHandle -ne [System.IntPtr]::Zero) {
                [Win32]::SetWindowPos($process.MainWindowHandle, [IntPtr]::Zero, $X, $Y, $Width, $Height, 0x0040)
                Write-Log "Positioned window for $ProcessName at ($X,$Y) size ($Width,$Height)"
                return $true
            }
        }
    } catch {
        Write-Log "Failed to position window for $ProcessName" "ERROR"
    }
    return $false
}

# Service management functions
function Start-Service {
    param([object]$ServiceConfig)
    
    Write-Log "Starting service: $($ServiceConfig.name)"
    
    if ($ServiceConfig.command -match "^node") {
        # Start Node.js service in background according to user rules
        $args = $ServiceConfig.command.Replace("node ", "")
        Start-Process -FilePath "node" -ArgumentList $args -WindowStyle Hidden
        Write-Log "Started $($ServiceConfig.name) in background"
    } elseif ($ServiceConfig.command -match "^npm") {
        # Start npm service in background according to user rules  
        $args = $ServiceConfig.command.Replace("npm ", "")
        Start-Process -FilePath "npm" -ArgumentList $args -WindowStyle Hidden
        Write-Log "Started $($ServiceConfig.name) in background"
    } else {
        # Generic process start
        Start-Process -FilePath "cmd" -ArgumentList "/c", $ServiceConfig.command -WindowStyle Hidden
        Write-Log "Started $($ServiceConfig.name)"
    }
}

function Test-ServiceHealth {
    param([object]$ServiceConfig)
    
    if ($ServiceConfig.healthCheck) {
        try {
            $response = Invoke-WebRequest -Uri $ServiceConfig.healthCheck -TimeoutSec 3 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Log "$($ServiceConfig.name) is healthy"
                return $true
            }
        } catch {
            Write-Log "$($ServiceConfig.name) health check failed" "WARN"
        }
    }
    return $false
}

# Workspace management functions
function Start-Workspace {
    param([string]$WorkspaceName)
    
    $config = Get-Config
    if (!$config) { return }
    
    if (!$config.workspaces.$WorkspaceName) {
        Write-Log "Workspace '$WorkspaceName' not found" "ERROR"
        return
    }
    
    $workspace = $config.workspaces.$WorkspaceName
    Write-Log "Starting workspace: $WorkspaceName - $($workspace.description)"
    
    # Start services first
    if ($config.environment.AUTO_START_SERVICES) {
        foreach ($serviceName in $config.services.PSObject.Properties.Name) {
            $service = $config.services.$serviceName
            Start-Service -ServiceConfig $service
            Start-Sleep -Seconds 2
        }
        
        # Wait for services to be ready
        Write-Log "Waiting for services to be ready..."
        Start-Sleep -Seconds 5
    }
    
    # Launch windows
    foreach ($window in $workspace.windows) {
        if ($window.url) {
            # Open URL in default browser
            Start-Process $window.url
            Write-Log "Opened URL: $($window.url)"
        } elseif ($window.process) {
            # Start process
            $processArgs = @()
            if ($window.args) { $processArgs = $window.args }
            if ($window.workdir) {
                Start-Process -FilePath $window.process -ArgumentList $processArgs -WorkingDirectory $window.workdir
            } else {
                Start-Process -FilePath $window.process -ArgumentList $processArgs
            }
            Write-Log "Started process: $($window.process)"
            
            # Position window after short delay
            Start-Sleep -Seconds 2
            if ($window.position) {
                Set-WindowPosition -ProcessName $window.process -X $window.position.x -Y $window.position.y -Width $window.position.width -Height $window.position.height
            }
        }
    }
}

function Stop-Workspace {
    Write-Log "Stopping all workspace processes"
    
    # Stop Node.js processes
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    
    # Stop browsers if needed
    # Get-Process -Name "chrome", "msedge", "firefox" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*localhost*" } | Stop-Process -Force
    
    Write-Log "Workspace stopped"
}

function Get-WorkspaceStatus {
    $config = Get-Config
    if (!$config) { return }
    
    Write-Host ""
    Write-Host "🖥️  DESKTOP COMMANDER STATUS" -ForegroundColor Magenta
    Write-Host "=============================="
    Write-Host ""
    
    # Service status
    Write-Host "SERVICES:" -ForegroundColor Cyan
    foreach ($serviceName in $config.services.PSObject.Properties.Name) {
        $service = $config.services.$serviceName
        $isHealthy = Test-ServiceHealth -ServiceConfig $service
        if ($isHealthy) {
            Write-Host "  $($service.name): ✅ ONLINE (Port $($service.port))" -ForegroundColor Green
        } else {
            Write-Host "  $($service.name): ❌ OFFLINE" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "AVAILABLE WORKSPACES:" -ForegroundColor Cyan
    foreach ($workspaceName in $config.workspaces.PSObject.Properties.Name) {
        $workspace = $config.workspaces.$workspaceName
        Write-Host "  $workspaceName - $($workspace.description)" -ForegroundColor Gray
    }
    Write-Host ""
}

# Command definitions
$Commands = @{
    "/start" = @{
        Description = "Start a workspace"
        Script = { 
            if (!$Workspace) {
                Write-Host "Usage: desktop-commander.ps1 /start -Workspace <workspace-name>" -ForegroundColor Yellow
                return
            }
            Start-Workspace -WorkspaceName $Workspace
        }
    }
    
    "/stop" = @{
        Description = "Stop current workspace"
        Script = { Stop-Workspace }
    }
    
    "/status" = @{
        Description = "Show desktop and service status"
        Script = { Get-WorkspaceStatus }
    }
    
    "/restart-services" = @{
        Description = "Restart all services"
        Script = { 
            Stop-Workspace
            Start-Sleep -Seconds 3
            $config = Get-Config
            foreach ($serviceName in $config.services.PSObject.Properties.Name) {
                $service = $config.services.$serviceName
                Start-Service -ServiceConfig $service
                Start-Sleep -Seconds 2
            }
        }
    }
    
    "/init" = @{
        Description = "Initialize desktop commander environment"
        Script = {
            Write-Host ""
            Write-Host "🖥️  INITIALIZING DESKTOP COMMANDER" -ForegroundColor Magenta
            Write-Host "===================================="
            Write-Host ""
            
            # Create necessary directories
            $dirs = @("logs", "workspace-templates", "scripts")
            foreach ($dir in $dirs) {
                if (!(Test-Path $dir)) {
                    New-Item -ItemType Directory -Path $dir -Force | Out-Null
                    Write-Log "Created directory: $dir"
                }
            }
            
            # Test configuration
            $config = Get-Config
            if ($config) {
                Write-Log "Configuration loaded successfully"
                Write-Host "✅ Desktop Commander initialized successfully!" -ForegroundColor Green
                Write-Host ""
                Write-Host "Available workspaces:" -ForegroundColor Cyan
                foreach ($workspaceName in $config.workspaces.PSObject.Properties.Name) {
                    $workspace = $config.workspaces.$workspaceName
                    Write-Host "  • $workspaceName - $($workspace.description)" -ForegroundColor Gray
                }
                Write-Host ""
                Write-Host "Quick start:" -ForegroundColor Yellow
                Write-Host "  desktop-commander.ps1 /start -Workspace trading"
                Write-Host "  desktop-commander.ps1 /status"
                Write-Host ""
            } else {
                Write-Log "Configuration failed to load" "ERROR"
            }
        }
    }
    
    "/help" = @{
        Description = "Show all available commands"
        Script = { }  # Handled specially below
    }
}

# Execute command
if ($Commands.ContainsKey($Command) -or $Command -eq "help") {
    if ($Command -eq "help" -or $Command -eq "/help") {
        Write-Host ""
        Write-Host "🖥️  DESKTOP COMMANDER COMMANDS" -ForegroundColor Magenta
        Write-Host "==============================="
        Write-Host ""
        Write-Host "WORKSPACE MANAGEMENT:" -ForegroundColor Cyan
        Write-Host "  /init              - Initialize desktop commander"
        Write-Host "  /start -Workspace <name> - Start a workspace"
        Write-Host "  /stop              - Stop current workspace"
        Write-Host "  /status            - Show status and available workspaces"
        Write-Host ""
        Write-Host "SERVICE MANAGEMENT:" -ForegroundColor Cyan
        Write-Host "  /restart-services  - Restart all services"
        Write-Host ""
        Write-Host "EXAMPLES:" -ForegroundColor Yellow
        Write-Host "  desktop-commander.ps1 /init"
        Write-Host "  desktop-commander.ps1 /start -Workspace trading"
        Write-Host "  desktop-commander.ps1 /start -Workspace development"
        Write-Host "  desktop-commander.ps1 /status"
        Write-Host ""
        Write-Host "AVAILABLE WORKSPACES:" -ForegroundColor Cyan
        $config = Get-Config
        if ($config) {
            foreach ($workspaceName in $config.workspaces.PSObject.Properties.Name) {
                $workspace = $config.workspaces.$workspaceName
                Write-Host "  • $workspaceName - $($workspace.description)" -ForegroundColor Gray
            }
        }
        Write-Host ""
        return
    }
    
    Write-Log "Executing command: $Command"
    
    try {
        & $Commands[$Command].Script
    } catch {
        Write-Log "Command failed: $($_.Exception.Message)" "ERROR"
    }
} else {
    Write-Host "❌ Unknown command: $Command" -ForegroundColor Red
    Write-Host "Run 'desktop-commander.ps1 /help' to see available commands" -ForegroundColor Yellow
}
