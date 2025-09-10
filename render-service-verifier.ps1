# TaskMaster Render Service Verification Script
# This script tests all deployed services to ensure they're working correctly

param(
    [switch]$Quick,
    [switch]$Detailed
)

Write-Host "`n🔍 TASKMASTER RENDER SERVICE VERIFIER" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Gray

# Expected service URLs after Blueprint deployment
$services = @{
    "Backend API" = @{
        "url" = "https://taskmaster-backend.onrender.com"
        "healthCheck" = "/api/v1/test"
        "port" = "3001"
    }
    "Auto Balance" = @{
        "url" = "https://taskmaster-auto-balance.onrender.com"
        "healthCheck" = "/"
        "port" = "3000"
    }
    "Monitor Service" = @{
        "url" = "https://taskmaster-monitor.onrender.com"
        "healthCheck" = "/"
        "port" = "3002"
    }
    "Frontend App" = @{
        "url" = "https://taskmaster-frontend.onrender.com"
        "healthCheck" = "/"
        "port" = "static"
    }
}

$results = @{}
$allHealthy = $true

Write-Host "`n📊 TESTING SERVICES..." -ForegroundColor Cyan

foreach ($serviceName in $services.Keys) {
    $service = $services[$serviceName]
    $testUrl = $service.url + $service.healthCheck
    
    Write-Host "`n🔧 Testing: $serviceName" -ForegroundColor Yellow
    Write-Host "   URL: $testUrl" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $testUrl -Method GET -TimeoutSec 30 -UseBasicParsing
        
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ Status: HEALTHY (200 OK)" -ForegroundColor Green
            $results[$serviceName] = @{
                "status" = "HEALTHY"
                "code" = $response.StatusCode
                "responseTime" = (Measure-Command { Invoke-WebRequest -Uri $testUrl -Method GET -TimeoutSec 10 -UseBasicParsing }).TotalMilliseconds
            }
            
            if ($Detailed) {
                Write-Host "   📊 Response Time: $($results[$serviceName].responseTime.ToString('F0'))ms" -ForegroundColor Cyan
                if ($response.Content.Length -lt 1000) {
                    Write-Host "   📄 Response Preview: $($response.Content.Substring(0, [Math]::Min(200, $response.Content.Length)))" -ForegroundColor Gray
                }
            }
        } else {
            Write-Host "   ⚠️  Status: UNEXPECTED ($($response.StatusCode))" -ForegroundColor Yellow
            $results[$serviceName] = @{
                "status" = "UNEXPECTED"
                "code" = $response.StatusCode
            }
            $allHealthy = $false
        }
    }
    catch {
        Write-Host "   ❌ Status: FAILED" -ForegroundColor Red
        Write-Host "   📋 Error: $($_.Exception.Message)" -ForegroundColor Red
        $results[$serviceName] = @{
            "status" = "FAILED"
            "error" = $_.Exception.Message
        }
        $allHealthy = $false
    }
}

# Summary Report
Write-Host "`n📋 DEPLOYMENT VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray

$healthyCount = ($results.Values | Where-Object { $_.status -eq "HEALTHY" }).Count
$totalCount = $results.Count

Write-Host "`n🎯 Services Status: $healthyCount/$totalCount HEALTHY" -ForegroundColor $(if ($allHealthy) { "Green" } else { "Yellow" })

foreach ($serviceName in $results.Keys) {
    $result = $results[$serviceName]
    $statusColor = switch ($result.status) {
        "HEALTHY" { "Green" }
        "UNEXPECTED" { "Yellow" }
        "FAILED" { "Red" }
    }
    Write-Host "   • $serviceName`: $($result.status)" -ForegroundColor $statusColor
}

if ($allHealthy) {
    Write-Host "`n🎉 ALL SERVICES DEPLOYED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "Your TaskMaster application is ready to use!" -ForegroundColor Green
    
    Write-Host "`n🔗 Quick Access URLs:" -ForegroundColor Cyan
    Write-Host "   Frontend: https://taskmaster-frontend.onrender.com" -ForegroundColor White
    Write-Host "   Backend API: https://taskmaster-backend.onrender.com" -ForegroundColor White
    Write-Host "   Monitor: https://taskmaster-monitor.onrender.com" -ForegroundColor White
} else {
    Write-Host "`n⚠️  Some services need attention." -ForegroundColor Yellow
    Write-Host "Check the Render dashboard for deployment logs and errors." -ForegroundColor Yellow
}

Write-Host "`n💡 Usage:" -ForegroundColor Cyan
Write-Host "   Quick check: ./render-service-verifier.ps1 -Quick" -ForegroundColor Gray
Write-Host "   Detailed check: ./render-service-verifier.ps1 -Detailed" -ForegroundColor Gray

return $allHealthy
