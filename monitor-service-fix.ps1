# Monitor srv-d30eil7fte5s73eamba0 after applying fixes
param([switch]$Loop)

$serviceId = "srv-d30eil7fte5s73eamba0"
$serviceUrl = "https://$serviceId.onrender.com"
$healthUrl = "$serviceUrl/api/v1/test"

function Test-ServiceStatus {
    Write-Host "`n🔍 TESTING SERVICE: $serviceId" -ForegroundColor Cyan
    Write-Host "   Time: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
    
    # Test main URL
    Write-Host "   📡 Testing main URL..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri $serviceUrl -Method GET -TimeoutSec 15 -UseBasicParsing
        Write-Host "   ✅ Main URL: Status $($response.StatusCode)" -ForegroundColor Green
        $mainStatus = "OK"
    } catch {
        $errorMsg = $_.Exception.Message
        if ($errorMsg -like "*404*") {
            Write-Host "   ❌ Main URL: 404 Not Found (Still not deployed)" -ForegroundColor Red
            $mainStatus = "404"
        } elseif ($errorMsg -like "*timeout*") {
            Write-Host "   ⏳ Main URL: Timeout (Service may be starting)" -ForegroundColor Yellow
            $mainStatus = "TIMEOUT"
        } else {
            Write-Host "   ❌ Main URL: $errorMsg" -ForegroundColor Red
            $mainStatus = "ERROR"
        }
    }
    
    # Test health endpoint
    Write-Host "   📡 Testing health endpoint..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -Method GET -TimeoutSec 15 -UseBasicParsing
        Write-Host "   ✅ Health URL: Status $($response.StatusCode)" -ForegroundColor Green
        Write-Host "   📄 Response preview: $($response.Content.Substring(0, [Math]::Min(100, $response.Content.Length)))" -ForegroundColor Cyan
        $healthStatus = "OK"
    } catch {
        $errorMsg = $_.Exception.Message
        if ($errorMsg -like "*404*") {
            Write-Host "   ❌ Health URL: 404 Not Found" -ForegroundColor Red
            $healthStatus = "404"
        } else {
            Write-Host "   ❌ Health URL: $errorMsg" -ForegroundColor Red
            $healthStatus = "ERROR"
        }
    }
    
    # Overall status
    if ($mainStatus -eq "OK" -and $healthStatus -eq "OK") {
        Write-Host "`n🎉 SERVICE IS WORKING! All endpoints are healthy." -ForegroundColor Green
        return $true
    } elseif ($mainStatus -eq "404" -or $healthStatus -eq "404") {
        Write-Host "`n⚠️  Service still returning 404. May need more time to deploy." -ForegroundColor Yellow
        return $false
    } else {
        Write-Host "`n❌ Service has issues. Check the deployment logs." -ForegroundColor Red
        return $false
    }
}

# Main execution
Write-Host "`n🎯 SERVICE MONITORING: $serviceId" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Gray

if ($Loop) {
    Write-Host "🔄 Loop mode: Checking every 30 seconds (Ctrl+C to stop)" -ForegroundColor Blue
    $attempt = 1
    do {
        Write-Host "`n--- Attempt $attempt ---" -ForegroundColor Yellow
        $isWorking = Test-ServiceStatus
        
        if ($isWorking) {
            Write-Host "`n✅ SERVICE FIXED! Monitoring complete." -ForegroundColor Green
            break
        } else {
            Write-Host "`n⏳ Waiting 30 seconds before next check..." -ForegroundColor Gray
            Start-Sleep -Seconds 30
            $attempt++
        }
    } while ($true)
} else {
    $isWorking = Test-ServiceStatus
}

Write-Host "`n🔗 Quick Links:" -ForegroundColor Cyan
Write-Host "   • Service URL: $serviceUrl" -ForegroundColor White
Write-Host "   • Health Check: $healthUrl" -ForegroundColor White
Write-Host "   • Dashboard: https://dashboard.render.com/web/$serviceId" -ForegroundColor White
Write-Host "   • Logs: https://dashboard.render.com/web/$serviceId/logs" -ForegroundColor White

Write-Host "`n💡 Commands:" -ForegroundColor Cyan
Write-Host "   • Single check: ./monitor-service-fix.ps1" -ForegroundColor Gray
Write-Host "   • Continuous monitoring: ./monitor-service-fix.ps1 -Loop" -ForegroundColor Gray
