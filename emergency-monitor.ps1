# Emergency Trading System Monitor
# Runs basic health checks and system monitoring

param(
    [int]$IntervalMinutes = 5,
    [int]$MaxIterations = 12  # Run for 1 hour by default
)

$logFile = "emergency-monitor-$(Get-Date -Format 'yyyy-MM-dd').log"

function Write-MonitorLog {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    Write-Host $logEntry -ForegroundColor Green
    Add-Content -Path $logFile -Value $logEntry
}

function Test-SystemHealth {
    Write-MonitorLog "🔍 Starting system health check..."
    
    # Check running Node processes
    $nodeProcesses = Get-Process | Where-Object { $_.ProcessName -like "*node*" }
    Write-MonitorLog "📊 Node processes running: $($nodeProcesses.Count)"
    
    # Check critical ports
    $ports = @(3000, 3001, 8003)
    foreach ($port in $ports) {
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:$port/" -Method GET -TimeoutSec 3 -ErrorAction Stop
            Write-MonitorLog "✅ Port $port: ONLINE"
        } catch {
            if ($_.Exception.Message -like "*404*") {
                Write-MonitorLog "⚠️ Port $port: Responding (404 - server online but endpoint missing)"
            } else {
                Write-MonitorLog "❌ Port $port: OFFLINE"
            }
        }
    }
    
    # Check disk space
    $disk = Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DeviceID -eq "C:" }
    $freeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 2)
    Write-MonitorLog "💾 Free disk space: ${freeSpaceGB}GB"
    
    # Memory usage
    $memory = Get-WmiObject -Class Win32_ComputerSystem
    $totalMemoryGB = [math]::Round($memory.TotalPhysicalMemory / 1GB, 2)
    $freeMemory = Get-Counter '\Memory\Available MBytes'
    $freeMemoryGB = [math]::Round($freeMemory.CounterSamples.CookedValue / 1024, 2)
    Write-MonitorLog "🧠 Memory: ${freeMemoryGB}GB free of ${totalMemoryGB}GB total"
    
    Write-MonitorLog "✅ Health check completed"
}

Write-MonitorLog "🚀 Emergency Monitor Started - Interval: ${IntervalMinutes}min, Max runs: $MaxIterations"

for ($i = 1; $i -le $MaxIterations; $i++) {
    Write-MonitorLog "🔄 Monitor cycle $i of $MaxIterations"
    Test-SystemHealth
    
    if ($i -lt $MaxIterations) {
        Write-MonitorLog "⏳ Waiting ${IntervalMinutes} minutes until next check..."
        Start-Sleep ($IntervalMinutes * 60)
    }
}

Write-MonitorLog "🏁 Emergency monitoring completed"
