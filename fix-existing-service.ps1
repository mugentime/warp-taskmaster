# Simple Service Fix for srv-d30eil7fte5s73eamba0
# Manual configuration guide to fix the existing service

Write-Host "`n🔧 FIXING SERVICE srv-d30eil7fte5s73eamba0" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Gray

Write-Host "`n🚨 CURRENT STATUS: SERVICE RETURNING 404" -ForegroundColor Red
Write-Host "This means the service is not properly deployed or configured." -ForegroundColor Yellow

Write-Host "`n📋 MANUAL FIX STEPS (Do these in Render Dashboard):" -ForegroundColor Cyan

Write-Host "`n1️⃣  GO TO SERVICE SETTINGS:" -ForegroundColor Yellow
Write-Host "   • Open: https://dashboard.render.com/web/srv-d30eil7fte5s73eamba0" -ForegroundColor White
Write-Host "   • Click 'Settings' tab" -ForegroundColor White

Write-Host "`n2️⃣  UPDATE REPOSITORY SETTINGS:" -ForegroundColor Yellow
Write-Host "   • Repository: https://github.com/mugentime/taskmaster-auto-balance" -ForegroundColor White
Write-Host "   • Branch: main" -ForegroundColor White
Write-Host "   • Root Directory: (leave empty)" -ForegroundColor White

Write-Host "`n3️⃣  UPDATE BUILD & START COMMANDS:" -ForegroundColor Yellow
Write-Host "   • Build Command: npm install" -ForegroundColor White
Write-Host "   • Start Command: node server.js" -ForegroundColor White

Write-Host "`n4️⃣  SET ENVIRONMENT VARIABLES:" -ForegroundColor Yellow
Write-Host "   • NODE_ENV = production" -ForegroundColor White
Write-Host "   • PORT = 10000 (Render default)" -ForegroundColor White
Write-Host "   • Add your API keys if needed:" -ForegroundColor Gray
Write-Host "     - BINANCE_API_KEY" -ForegroundColor Gray
Write-Host "     - BINANCE_API_SECRET" -ForegroundColor Gray

Write-Host "`n5️⃣  DEPLOY:" -ForegroundColor Yellow
Write-Host "   • Click 'Manual Deploy' > 'Deploy latest commit'" -ForegroundColor White
Write-Host "   • Wait 5-10 minutes for deployment" -ForegroundColor White

Write-Host "`n🔍 VERIFICATION AFTER DEPLOYMENT:" -ForegroundColor Cyan

$serviceUrl = "https://srv-d30eil7fte5s73eamba0.onrender.com"
$healthUrl = "$serviceUrl/api/v1/test"

Write-Host "   Test URLs:" -ForegroundColor Gray
Write-Host "   • Main: $serviceUrl" -ForegroundColor White
Write-Host "   • Health: $healthUrl" -ForegroundColor White

Write-Host "`n💡 TESTING CURRENT STATUS:" -ForegroundColor Blue

try {
    Write-Host "   📡 Testing service..." -ForegroundColor Gray
    $response = Invoke-WebRequest -Uri $serviceUrl -Method GET -TimeoutSec 10 -UseBasicParsing
    Write-Host "   ✅ Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    $errorMsg = $_.Exception.Message
    if ($errorMsg -like "*404*") {
        Write-Host "   ❌ Status: 404 Not Found (Service not deployed)" -ForegroundColor Red
    } elseif ($errorMsg -like "*timeout*") {
        Write-Host "   ⏳ Status: Timeout (Service might be starting)" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ Status: $errorMsg" -ForegroundColor Red
    }
}

Write-Host "`n🎯 EXPECTED AFTER FIX:" -ForegroundColor Green
Write-Host "   • Service should return 200 OK" -ForegroundColor White
Write-Host "   • Health endpoint should return Binance API status" -ForegroundColor White
Write-Host "   • No more 404 errors" -ForegroundColor White

Write-Host "`n⚡ QUICK RETEST COMMAND:" -ForegroundColor Cyan
Write-Host "   ./fix-existing-service.ps1 -Test" -ForegroundColor Gray

# Test mode
if ($args -contains "-Test") {
    Write-Host "`n🔄 QUICK RETEST MODE:" -ForegroundColor Blue
    
    Write-Host "   Testing main URL..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri $serviceUrl -Method GET -TimeoutSec 15 -UseBasicParsing
        Write-Host "   ✅ Main URL: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Main URL: Failed ($($_.Exception.Message))" -ForegroundColor Red
    }
    
    Write-Host "   Testing health endpoint..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -Method GET -TimeoutSec 15 -UseBasicParsing
        Write-Host "   ✅ Health URL: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "   📄 Response: $($response.Content.Substring(0, [Math]::Min(100, $response.Content.Length)))" -ForegroundColor Cyan
    } catch {
        Write-Host "   ❌ Health URL: Failed ($($_.Exception.Message))" -ForegroundColor Red
    }
}

Write-Host "`n🔗 USEFUL LINKS:" -ForegroundColor Cyan
Write-Host "   • Service Dashboard: https://dashboard.render.com/web/srv-d30eil7fte5s73eamba0" -ForegroundColor White
Write-Host "   • Deployment Logs: https://dashboard.render.com/web/srv-d30eil7fte5s73eamba0/logs" -ForegroundColor White
Write-Host "   • Backend Repository: https://github.com/mugentime/taskmaster-auto-balance" -ForegroundColor White
