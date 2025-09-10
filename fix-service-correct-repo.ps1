# CORRECTED Service Fix for srv-d30eil7fte5s73eamba0
# Using the correct warp-taskmaster repository

Write-Host "`n🔧 FIXING SERVICE srv-d30eil7fte5s73eamba0" -ForegroundColor Green
Write-Host "Using CORRECT repository: warp-taskmaster" -ForegroundColor Yellow
Write-Host "=" * 50 -ForegroundColor Gray

Write-Host "`n📋 CORRECTED RENDER DASHBOARD STEPS:" -ForegroundColor Cyan

Write-Host "`n1️⃣  GO TO SERVICE SETTINGS:" -ForegroundColor Yellow
Write-Host "   • Open: https://dashboard.render.com/web/srv-d30eil7fte5s73eamba0" -ForegroundColor White
Write-Host "   • Click 'Settings' tab" -ForegroundColor White

Write-Host "`n2️⃣  UPDATE REPOSITORY SETTINGS:" -ForegroundColor Yellow
Write-Host "   • Repository: https://github.com/mugentime/warp-taskmaster.git" -ForegroundColor White
Write-Host "   • Branch: fix/telegram-position-notifs" -ForegroundColor White
Write-Host "   • Root Directory: backend" -ForegroundColor White

Write-Host "`n3️⃣  UPDATE BUILD & START COMMANDS:" -ForegroundColor Yellow
Write-Host "   • Build Command: npm install" -ForegroundColor White
Write-Host "   • Start Command: node server.js" -ForegroundColor White

Write-Host "`n4️⃣  SET ENVIRONMENT VARIABLES:" -ForegroundColor Yellow
Write-Host "   • NODE_ENV = production" -ForegroundColor White
Write-Host "   • PORT = 10000" -ForegroundColor White
Write-Host "   • Add your API keys:" -ForegroundColor Gray
Write-Host "     - BINANCE_API_KEY = (your key)" -ForegroundColor Gray
Write-Host "     - BINANCE_API_SECRET = (your secret)" -ForegroundColor Gray

Write-Host "`n5️⃣  DEPLOY:" -ForegroundColor Yellow
Write-Host "   • Click 'Manual Deploy' > 'Deploy latest commit'" -ForegroundColor White
Write-Host "   • Wait 5-10 minutes for deployment" -ForegroundColor White

Write-Host "`n🔍 WHY THIS CONFIGURATION:" -ForegroundColor Blue
Write-Host "   • warp-taskmaster repo contains the complete project" -ForegroundColor White
Write-Host "   • backend/ folder has the server code we need" -ForegroundColor White
Write-Host "   • fix/telegram-position-notifs branch has latest updates" -ForegroundColor White
Write-Host "   • server.js is the main entry point for the API" -ForegroundColor White

Write-Host "`n📊 EXPECTED ENDPOINTS AFTER FIX:" -ForegroundColor Green
$serviceUrl = "https://srv-d30eil7fte5s73eamba0.onrender.com"
Write-Host "   • Main API: $serviceUrl" -ForegroundColor White
Write-Host "   • Health Check: $serviceUrl/api/v1/test" -ForegroundColor White
Write-Host "   • Bot Status: $serviceUrl/api/v1/bot-status" -ForegroundColor White
Write-Host "   • Balance Info: $serviceUrl/api/v1/balance" -ForegroundColor White

Write-Host "`n🔗 VERIFICATION LINKS:" -ForegroundColor Cyan
Write-Host "   • Service Dashboard: https://dashboard.render.com/web/srv-d30eil7fte5s73eamba0" -ForegroundColor White
Write-Host "   • Deployment Logs: https://dashboard.render.com/web/srv-d30eil7fte5s73eamba0/logs" -ForegroundColor White
Write-Host "   • Source Repository: https://github.com/mugentime/warp-taskmaster/tree/fix/telegram-position-notifs/backend" -ForegroundColor White

# Test current status
Write-Host "`n🔍 TESTING CURRENT STATUS:" -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri $serviceUrl -Method GET -TimeoutSec 10 -UseBasicParsing
    Write-Host "   ✅ Status: $($response.StatusCode) - Service is responding!" -ForegroundColor Green
} catch {
    $errorMsg = $_.Exception.Message
    if ($errorMsg -like "*404*") {
        Write-Host "   ❌ Status: 404 Not Found - Service needs to be deployed" -ForegroundColor Red
        Write-Host "   📋 Follow the steps above to fix this" -ForegroundColor Yellow
    } elseif ($errorMsg -like "*timeout*") {
        Write-Host "   ⏳ Status: Timeout - Service may be starting up" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ Status: $errorMsg" -ForegroundColor Red
    }
}

Write-Host "`n💡 AFTER FIXING, TEST WITH:" -ForegroundColor Cyan
Write-Host "   ./monitor-service-fix.ps1" -ForegroundColor Gray
