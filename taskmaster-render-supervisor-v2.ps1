# TaskMaster Multi-Service Render Supervisor v2.0
# Enhanced for the new 4-service architecture

param(
    [int]$CycleDurationMinutes = 5,
    [int]$MaxCycles = 24,  # 2 hours total
    [switch]$QuickTest,
    [switch]$DetailedLogging
)

$ErrorActionPreference = "Continue"

# Service Configuration
$services = @{
    "Backend API" = @{
        "url" = "https://taskmaster-backend.onrender.com"
        "healthPath" = "/api/v1/test"
        "critical" = $true
        "description" = "Main API service handling bot management"
    }
    "Auto Balance" = @{
        "url" = "https://taskmaster-auto-balance.onrender.com"
        "healthPath" = "/"
        "critical" = $true
        "description" = "Automated balance management service"
    }
    "Monitor Service" = @{
        "url" = "https://taskmaster-monitor.onrender.com"
        "healthPath" = "/"
        "critical" = $false
        "description" = "System monitoring and health checks"
    }
    "Frontend App" = @{
        "url" = "https://taskmaster-frontend.onrender.com"
        "healthPath" = "/"
        "critical" = $false
        "description" = "Web interface for TaskMaster"
    }
}

$logFile = "taskmaster-supervisor-$(Get-Date -Format 'yyyy-MM-dd').log"
$currentCycle = 0
$startTime = Get-Date

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Write-Host $logEntry
    Add-Content -Path $logFile -Value $logEntry
}

function Test-ServiceHealth {
    param([string]$ServiceName, [hashtable]$ServiceConfig)
    
    $testUrl = $ServiceConfig.url + $ServiceConfig.healthPath
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri $testUrl -Method GET -TimeoutSec 30 -UseBasicParsing
        $stopwatch.Stop()
        
        $result = @{
            "status" = if ($response.StatusCode -eq 200) { "HEALTHY" } else { "DEGRADED" }
            "statusCode" = $response.StatusCode
            "responseTime" = $stopwatch.ElapsedMilliseconds
            "contentLength" = $response.Content.Length
            "error" = $null
        }
        
        if ($DetailedLogging -and $response.StatusCode -eq 200) {
            Write-Log "✅ $ServiceName - OK ($($result.responseTime)ms)" "SUCCESS"
        } elseif ($response.StatusCode -ne 200) {
            Write-Log "⚠️  $ServiceName - Unexpected status: $($response.StatusCode)" "WARNING"
        }
        
        return $result
        
    } catch {
        $result = @{
            "status" = "FAILED"
            "statusCode" = 0
            "responseTime" = 0
            "contentLength" = 0
            "error" = $_.Exception.Message
        }
        
        Write-Log "❌ $ServiceName - FAILED: $($_.Exception.Message)" "ERROR"
        return $result
    }
}

function Test-AllServices {
    Write-Log "🔍 Starting health check cycle $($currentCycle + 1)/$MaxCycles"
    
    $cycleResults = @{}
    $criticalFailures = 0
    $totalFailures = 0
    
    foreach ($serviceName in $services.Keys) {
        $service = $services[$serviceName]
        $result = Test-ServiceHealth -ServiceName $serviceName -ServiceConfig $service
        
        $cycleResults[$serviceName] = $result
        
        if ($result.status -eq "FAILED") {
            $totalFailures++
            if ($service.critical) {
                $criticalFailures++
            }
        }
    }
    
    # Cycle Summary
    $healthyCount = ($cycleResults.Values | Where-Object { $_.status -eq "HEALTHY" }).Count
    $totalCount = $cycleResults.Count
    
    if ($criticalFailures -eq 0) {
        Write-Log "✅ Cycle Complete: $healthyCount/$totalCount services healthy" "SUCCESS"
    } else {
        Write-Log "⚠️  Cycle Complete: $criticalFailures critical failures detected!" "WARNING"
    }
    
    return @{
        "results" = $cycleResults
        "criticalFailures" = $criticalFailures
        "totalFailures" = $totalFailures
        "healthyCount" = $healthyCount
        "totalCount" = $totalCount
    }
}

function Show-StatusDashboard {
    param([hashtable]$CycleData)
    
    Clear-Host
    Write-Host "`n🎯 TASKMASTER RENDER SUPERVISOR v2.0" -ForegroundColor Green
    Write-Host "=" * 60 -ForegroundColor Gray
    
    $elapsed = (Get-Date) - $startTime
    Write-Host "🕒 Running Time: $($elapsed.ToString('hh\:mm\:ss'))" -ForegroundColor Cyan
    Write-Host "🔄 Current Cycle: $($currentCycle + 1)/$MaxCycles" -ForegroundColor Cyan
    Write-Host "📊 Overall Status: $(if ($CycleData.criticalFailures -eq 0) { 'STABLE' } else { 'CRITICAL' })" -ForegroundColor $(if ($CycleData.criticalFailures -eq 0) { 'Green' } else { 'Red' })
    
    Write-Host "`n📋 SERVICE STATUS:" -ForegroundColor Yellow
    
    foreach ($serviceName in $services.Keys) {
        $result = $CycleData.results[$serviceName]
        $service = $services[$serviceName]
        
        $statusIcon = switch ($result.status) {
            "HEALTHY" { "✅" }
            "DEGRADED" { "⚠️ " }
            "FAILED" { "❌" }
        }
        
        $criticality = if ($service.critical) { "[CRITICAL]" } else { "[OPTIONAL]" }
        
        Write-Host "$statusIcon $serviceName $criticality" -ForegroundColor $(
            switch ($result.status) {
                "HEALTHY" { "Green" }
                "DEGRADED" { "Yellow" }
                "FAILED" { "Red" }
            }
        )
        
        if ($result.responseTime -gt 0) {
            Write-Host "   Response: $($result.responseTime)ms | Status: $($result.statusCode)" -ForegroundColor Gray
        }
        if ($result.error) {
            Write-Host "   Error: $($result.error)" -ForegroundColor Red
        }
    }
    
    Write-Host "`n🔗 Service URLs:" -ForegroundColor Cyan
    foreach ($serviceName in $services.Keys) {
        Write-Host "   $serviceName`: $($services[$serviceName].url)" -ForegroundColor White
    }
    
    Write-Host "`nNext check in: $CycleDurationMinutes minutes..." -ForegroundColor Gray
}

# Main Execution
Write-Log "🚀 TaskMaster Render Supervisor v2.0 Started"
Write-Log "📊 Monitoring $(($services.Keys | Where-Object { $services[$_].critical }).Count) critical and $(($services.Keys | Where-Object { !$services[$_].critical }).Count) optional services"

if ($QuickTest) {
    Write-Log "⚡ Quick test mode - single cycle only"
    $MaxCycles = 1
}

try {
    while ($currentCycle -lt $MaxCycles) {
        $cycleData = Test-AllServices
        Show-StatusDashboard -CycleData $cycleData
        
        $currentCycle++
        
        # Break early if critical services are down for too long
        if ($cycleData.criticalFailures -gt 0) {
            Write-Log "🚨 Critical service failures detected in cycle $currentCycle" "ERROR"
            
            if ($currentCycle -ge 3) {  # After 3 failed cycles
                Write-Log "🛑 Multiple critical failures - consider manual intervention" "ERROR"
            }
        }
        
        # Wait for next cycle (unless it's the last one or quick test)
        if ($currentCycle -lt $MaxCycles -and !$QuickTest) {
            Start-Sleep -Seconds ($CycleDurationMinutes * 60)
        }
    }
    
} catch {
    Write-Log "💥 Supervisor encountered an error: $($_.Exception.Message)" "ERROR"
} finally {
    $totalTime = (Get-Date) - $startTime
    Write-Log "🏁 Supervisor completed after $($totalTime.ToString('hh\:mm\:ss'))"
    Write-Log "📄 Full log available at: $logFile"
    
    Write-Host "`n🎯 FINAL SUMMARY:" -ForegroundColor Green
    Write-Host "Total Runtime: $($totalTime.ToString('hh\:mm\:ss'))" -ForegroundColor White
    Write-Host "Cycles Completed: $currentCycle" -ForegroundColor White
    Write-Host "Log File: $logFile" -ForegroundColor White
}

Write-Host "`n💡 Usage Examples:" -ForegroundColor Cyan
Write-Host "   Quick test: ./taskmaster-render-supervisor-v2.ps1 -QuickTest" -ForegroundColor Gray
Write-Host "   10-minute cycles: ./taskmaster-render-supervisor-v2.ps1 -CycleDurationMinutes 10" -ForegroundColor Gray
Write-Host "   Detailed logging: ./taskmaster-render-supervisor-v2.ps1 -DetailedLogging" -ForegroundColor Gray
