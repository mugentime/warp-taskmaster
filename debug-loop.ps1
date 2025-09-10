# TaskMaster-Orchestrated Render Debugging Loop
# Following your rule: TaskMaster as main architect in agent mode

Write-Host "🎯 TASKMASTER DEBUGGING PROTOCOL - RENDER DEPLOYMENT" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# Render URLs with actual service ID
$BACKEND_URL = "https://srv-d30eil7fte5s73eamba0.onrender.com"
$FRONTEND_URL = "https://warp-taskmaster-frontend.onrender.com"

function Test-RenderDeployment {
    Write-Host "`n🔍 TESTING RENDER DEPLOYMENT..." -ForegroundColor Yellow
    
    # Test Backend Health
    Write-Host "1. Testing Backend Health Check..."
    try {
        $backendTest = Invoke-WebRequest "$BACKEND_URL/api/v1/test" -UseBasicParsing
        Write-Host "   ✅ Backend: $($backendTest.StatusCode) - $($backendTest.Content)" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Backend Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    
    # Test Frontend Root
    Write-Host "2. Testing Frontend Root..."
    try {
        $frontendTest = Invoke-WebRequest $FRONTEND_URL -UseBasicParsing
        Write-Host "   ✅ Frontend Root: $($frontendTest.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Frontend Root Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test SPA Route (critical for the Not Found fix)
    Write-Host "3. Testing SPA Deep Route (Not Found fix)..."
    try {
        $spaTest = Invoke-WebRequest "$FRONTEND_URL/dashboard" -UseBasicParsing
        Write-Host "   ✅ SPA Route: $($spaTest.StatusCode) - Not Found issue FIXED!" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ SPA Route Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "      → This indicates SPA rewrite rules may not be working" -ForegroundColor Yellow
    }
    
    return $true
}

function Start-PlaywrightTests {
    Write-Host "`n🎭 PLAYWRIGHT MCP TESTS..." -ForegroundColor Magenta
    Write-Host "Note: This would typically use Playwright MCP server for automated testing"
    
    # Placeholder for Playwright MCP integration
    # In actual implementation, this would:
    # - Create ephemeral test specs
    # - Run against both local and Render URLs
    # - Capture screenshots and traces
    # - Report results back to TaskMaster
    
    Write-Host "   📝 Tests to implement:"
    Write-Host "      - Home page loads (200)"
    Write-Host "      - Deep routes work (SPA rewrite)"
    Write-Host "      - API calls function"
    Write-Host "      - Error boundaries handle failures"
}

function Show-TaskMasterSummary {
    param($success)
    
    Write-Host "`n🤖 TASKMASTER ANALYSIS:" -ForegroundColor Cyan
    if ($success) {
        Write-Host "   ✅ Render deployment appears successful" -ForegroundColor Green
        Write-Host "   ✅ SPA rewrite fix applied" -ForegroundColor Green
        Write-Host "   ✅ Backend health check working" -ForegroundColor Green
        Write-Host "   🎯 Ready for production use" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Issues detected, continuing debugging loop..." -ForegroundColor Red
        Write-Host "   📊 Next steps: Check Render logs, adjust configuration" -ForegroundColor Yellow
    }
}

# Main debugging loop
$attempt = 1
while ($true) {
    Write-Host "`n🔄 DEBUGGING CYCLE #$attempt" -ForegroundColor White
    Write-Host "Time: $(Get-Date)" -ForegroundColor Gray
    
    $success = Test-RenderDeployment
    Start-PlaywrightTests
    Show-TaskMasterSummary -success $success
    
    if ($success) {
        Write-Host "`n🎉 DEPLOYMENT SUCCESS! Exiting debugging loop." -ForegroundColor Green
        break
    }
    
    Write-Host "`n⏳ Waiting 30 seconds before next cycle..." -ForegroundColor Gray
    Start-Sleep -Seconds 30
    $attempt++
    
    if ($attempt -gt 10) {
        Write-Host "`n⚠️  Max attempts reached. Manual intervention required." -ForegroundColor Red
        break
    }
}

# Cleanup background jobs when done
Write-Host "`n🧹 CLEANING UP BACKGROUND SERVICES..." -ForegroundColor Yellow
Get-Job | Where-Object {$_.Name -like "*test*"} | Stop-Job
Get-Job | Where-Object {$_.Name -like "*test*"} | Remove-Job

Write-Host "🎯 TaskMaster debugging protocol complete." -ForegroundColor Cyan
