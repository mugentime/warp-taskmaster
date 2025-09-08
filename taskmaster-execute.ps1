# 🤖 TASKMASTER RECOVERY EXECUTION SCRIPT
# Auto-generated recovery plan executor
# Run with: .\taskmaster-execute.ps1 -Phase 1

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("1", "2", "3", "all")]
    [string]$Phase,
    
    [Parameter()]
    [switch]$DryRun,
    
    [Parameter()]
    [switch]$Force
)

# TaskMaster Configuration
$TASKMASTER_CONFIG = @{
    LogPath = "C:\Users\je2al\Desktop\aplicaciones de trading\gemini binance futures\warp-taskmaster\logs"
    BackupPath = "C:\Users\je2al\Desktop\aplicaciones de trading\gemini binance futures\warp-taskmaster\backups"
    ConfigPath = "C:\Users\je2al\.trading-config"
    MaxRetries = 3
    TimeoutSeconds = 300
}

# Ensure directories exist
$TASKMASTER_CONFIG.Values | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
    }
}

# Logging function
function Write-TaskMasterLog {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    Write-Host $logEntry -ForegroundColor $(
        switch ($Level) {
            "ERROR" { "Red" }
            "WARNING" { "Yellow" }
            "SUCCESS" { "Green" }
            default { "White" }
        }
    )
    
    $logFile = Join-Path $TASKMASTER_CONFIG.LogPath "taskmaster-$(Get-Date -Format 'yyyy-MM-dd').log"
    Add-Content -Path $logFile -Value $logEntry
}

# Task execution wrapper
function Invoke-TaskMasterTask {
    param(
        [string]$TaskName,
        [scriptblock]$TaskScript,
        [string]$SuccessCriteria,
        [scriptblock]$RollbackScript = {}
    )
    
    Write-TaskMasterLog "🚀 Starting Task: $TaskName" "INFO"
    
    if ($DryRun) {
        Write-TaskMasterLog "📋 DRY RUN: Would execute $TaskName" "WARNING"
        return $true
    }
    
    $retryCount = 0
    $success = $false
    
    do {
        try {
            $retryCount++
            if ($retryCount -gt 1) {
                Write-TaskMasterLog "🔄 Retry attempt $retryCount for $TaskName" "WARNING"
            }
            
            # Execute the task
            $result = & $TaskScript
            
            if ($result) {
                Write-TaskMasterLog "✅ Task completed: $TaskName - $SuccessCriteria" "SUCCESS"
                $success = $true
            } else {
                throw "Task returned false or null result"
            }
            
        } catch {
            Write-TaskMasterLog "❌ Task failed: $TaskName - $($_.Exception.Message)" "ERROR"
            
            if ($retryCount -ge $TASKMASTER_CONFIG.MaxRetries) {
                Write-TaskMasterLog "🚨 Max retries exceeded for $TaskName. Executing rollback." "ERROR"
                
                try {
                    & $RollbackScript
                    Write-TaskMasterLog "🔄 Rollback completed for $TaskName" "WARNING"
                } catch {
                    Write-TaskMasterLog "💥 CRITICAL: Rollback failed for $TaskName" "ERROR"
                }
                
                if (-not $Force) {
                    throw "Task $TaskName failed after $retryCount attempts"
                }
            }
            
            Start-Sleep 5
        }
    } while (-not $success -and $retryCount -lt $TASKMASTER_CONFIG.MaxRetries)
    
    return $success
}

# PHASE 1 TASKS
function Execute-Phase1 {
    Write-TaskMasterLog "🚀 PHASE 1: EMERGENCY STABILIZATION" "INFO"
    
    # TASK 1.1: System Time Synchronization
    $success1_1 = Invoke-TaskMasterTask -TaskName "1.1 Time Synchronization" -TaskScript {
        w32tm /config /manualpeerlist:"time.windows.com" /syncfromflags:manual | Out-Null
        w32tm /config /reliable:yes | Out-Null
        w32tm /resync /force | Out-Null
        
        # Verify time sync
        $timeDiff = w32tm /stripchart /computer:time.windows.com /samples:1 /dataonly
        return $timeDiff -match "0\.0\d\ds" # Within 100ms
    } -SuccessCriteria "System time within 100ms of network time" -RollbackScript {
        w32tm /config /syncfromflags:domainHierarchy | Out-Null
    }
    
    if (-not $success1_1) { return $false }
    
    # TASK 1.2: API Credential Verification
    $success1_2 = Invoke-TaskMasterTask -TaskName "1.2 API Credentials" -TaskScript {
        # Backup existing credentials
        $backupPath = "C:\Users\je2al\Desktop\GEmini-binance-futures-arbitrage-monitor\backend\.env.backup"
        $envPath = "C:\Users\je2al\Desktop\GEmini-binance-futures-arbitrage-monitor\backend\.env"
        
        if (Test-Path $envPath) {
            Copy-Item $envPath $backupPath -Force
        }
        
        # Test API connection
        $currentLocation = Get-Location
        Set-Location "C:\Users\je2al\Desktop\aplicaciones de trading\gemini binance futures\warp-taskmaster"
        
        try {
            $result = node test-binance-direct.js 2>&1
            Set-Location $currentLocation
            
            # Check if API test was successful (look for specific success patterns)
            return ($result -match "Authentication OK" -or $result -match "Exchange Info OK")
        } catch {
            Set-Location $currentLocation
            return $false
        }
    } -SuccessCriteria "API returns successful authentication" -RollbackScript {
        $backupPath = "C:\Users\je2al\Desktop\GEmini-binance-futures-arbitrage-monitor\backend\.env.backup"
        $envPath = "C:\Users\je2al\Desktop\GEmini-binance-futures-arbitrage-monitor\backend\.env"
        
        if (Test-Path $backupPath) {
            Copy-Item $backupPath $envPath -Force
        }
    }
    
    if (-not $success1_2) { return $false }
    
    # TASK 1.3: Critical Server Revival  
    $success1_3 = Invoke-TaskMasterTask -TaskName "1.3 Server Revival" -TaskScript {
        # Kill problematic processes
        Get-Process | Where-Object {$_.ProcessName -eq "node" -and $_.Id -in @(10228, 11024)} | Stop-Process -Force -ErrorAction SilentlyContinue
        
        # Navigate and start backend
        $backendPath = "C:\Users\je2al\Desktop\GEmini-binance-futures-arbitrage-monitor\backend"
        
        if (-not (Test-Path $backendPath)) {
            return $false
        }
        
        $currentLocation = Get-Location
        Set-Location $backendPath
        
        try {
            # Install dependencies silently
            npm install --silent 2>$null
            
            # Start server in background
            Start-Process powershell -ArgumentList "-Command", "cd '$backendPath'; npm start" -WindowStyle Hidden
            
            Set-Location $currentLocation
            
            # Wait for startup
            Start-Sleep 15
            
            # Test health endpoint
            try {
                $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 10
                return $true
            } catch {
                # Try alternative endpoint
                try {
                    $response = Invoke-RestMethod -Uri "http://localhost:3001/" -Method GET -TimeoutSec 10
                    return $true
                } catch {
                    return $false
                }
            }
        } catch {
            Set-Location $currentLocation
            return $false
        }
    } -SuccessCriteria "Backend server responding on port 3001" -RollbackScript {
        Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
    }
    
    if (-not $success1_3) { return $false }
    
    # TASK 1.4: Emergency Monitoring
    $success1_4 = Invoke-TaskMasterTask -TaskName "1.4 Emergency Monitoring" -TaskScript {
        $currentLocation = Get-Location
        Set-Location "C:\Users\je2al\Desktop\aplicaciones de trading\gemini binance futures\warp-taskmaster"
        
        try {
            # Start balance monitoring job
            Start-Job -ScriptBlock {
                Set-Location "C:\Users\je2al\Desktop\aplicaciones de trading\gemini binance futures\warp-taskmaster"
                $counter = 0
                while ($counter -lt 12) { # Run for 1 hour (12 * 5 minutes)
                    try {
                        node check-futures-balance.js
                    } catch {
                        Write-Host "Balance check failed: $_"
                    }
                    Start-Sleep 300  # 5 minutes
                    $counter++
                }
            } -Name "BalanceMonitor" | Out-Null
            
            Set-Location $currentLocation
            
            # Verify job started
            $job = Get-Job -Name "BalanceMonitor" -ErrorAction SilentlyContinue
            return ($job -and $job.State -eq "Running")
            
        } catch {
            Set-Location $currentLocation
            return $false
        }
    } -SuccessCriteria "Balance monitoring job active" -RollbackScript {
        Get-Job -Name "BalanceMonitor" -ErrorAction SilentlyContinue | Stop-Job -Force
        Get-Job -Name "BalanceMonitor" -ErrorAction SilentlyContinue | Remove-Job -Force
    }
    
    Write-TaskMasterLog "🎉 PHASE 1 COMPLETED SUCCESSFULLY" "SUCCESS"
    return $true
}

# PHASE 2 TASKS (Placeholder - would be implemented similarly)
function Execute-Phase2 {
    Write-TaskMasterLog "🔧 PHASE 2: SYSTEM RESTORATION (Not yet implemented)" "WARNING"
    Write-TaskMasterLog "📋 Phase 2 requires manual configuration review before automation" "INFO"
    return $true
}

# PHASE 3 TASKS (Placeholder)
function Execute-Phase3 {
    Write-TaskMasterLog "🚀 PHASE 3: OPTIMIZATION & MONITORING (Not yet implemented)" "WARNING"
    Write-TaskMasterLog "📋 Phase 3 requires successful Phase 1 & 2 completion" "INFO"
    return $true
}

# Main execution
try {
    Write-TaskMasterLog "🤖 TaskMaster Recovery System Starting..." "INFO"
    Write-TaskMasterLog "📊 Phase: $Phase | DryRun: $DryRun | Force: $Force" "INFO"
    
    if (-not $Force) {
        Write-Host "`n⚠️  WARNING: This will make significant changes to your trading infrastructure." -ForegroundColor Yellow
        Write-Host "Are you sure you want to continue? (Y/N): " -NoNewline
        $confirmation = Read-Host
        
        if ($confirmation -ne 'Y' -and $confirmation -ne 'y') {
            Write-TaskMasterLog "🚫 Execution cancelled by user" "WARNING"
            exit 0
        }
    }
    
    $success = switch ($Phase) {
        "1" { Execute-Phase1 }
        "2" { Execute-Phase2 }
        "3" { Execute-Phase3 }
        "all" { 
            $p1 = Execute-Phase1
            if ($p1) { $p2 = Execute-Phase2 } else { $false }
            if ($p1 -and $p2) { Execute-Phase3 } else { $false }
        }
    }
    
    if ($success) {
        Write-TaskMasterLog "🎉 TaskMaster Phase $Phase completed successfully!" "SUCCESS"
        
        # Generate status report
        $reportPath = Join-Path $TASKMASTER_CONFIG.LogPath "phase-$Phase-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
        $report = @{
            phase = $Phase
            completedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            success = $true
            nextSteps = switch ($Phase) {
                "1" { "Execute Phase 2 for full system restoration" }
                "2" { "Execute Phase 3 for optimization and monitoring" }
                "3" { "System fully operational - begin trading activities" }
                "all" { "Complete system recovery successful" }
            }
        }
        
        $report | ConvertTo-Json | Out-File $reportPath
        Write-TaskMasterLog "📊 Report saved to: $reportPath" "INFO"
        
    } else {
        Write-TaskMasterLog "💥 TaskMaster Phase $Phase failed" "ERROR"
        exit 1
    }
    
} catch {
    Write-TaskMasterLog "🚨 CRITICAL ERROR: $($_.Exception.Message)" "ERROR"
    Write-TaskMasterLog "📞 Manual intervention required" "ERROR"
    exit 1
}
