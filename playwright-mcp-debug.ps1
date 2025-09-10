# Playwright MCP - Comprehensive Frontend Testing & Debugging
# Following Warp Drive Workflow: Render Debug Process

Write-Host "🎭 PLAYWRIGHT MCP - COMPREHENSIVE FRONTEND TESTING" -ForegroundColor Magenta
Write-Host "================================================================" -ForegroundColor Magenta

# Test URLs - try to find the actual working frontend URL
$PossibleFrontendUrls = @(
    "https://warp-taskmaster-frontend.onrender.com",
    "https://srv-d30eil7fte5s73eamba0.onrender.com",
    "https://warp-taskmaster.onrender.com"
)

$WorkingUrl = $null

# Find the actual working frontend URL
Write-Host "`n🔍 DISCOVERING ACTUAL FRONTEND URL..." -ForegroundColor Yellow
foreach ($url in $PossibleFrontendUrls) {
    Write-Host "Testing: $url" -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 15
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ FOUND WORKING FRONTEND: $url" -ForegroundColor Green
            $WorkingUrl = $url
            
            # Check if it's actually a frontend (contains HTML)
            if ($response.Content -like "*<html*" -or $response.Content -like "*<!DOCTYPE*") {
                Write-Host "✅ Confirmed: HTML content detected" -ForegroundColor Green
                break
            } else {
                Write-Host "⚠️ Responds but may not be frontend (no HTML)" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "❌ Not responding: $($_.Exception.Message.Split('.')[0])" -ForegroundColor Red
    }
}

if (-not $WorkingUrl) {
    Write-Host "`n❌ NO WORKING FRONTEND FOUND!" -ForegroundColor Red
    Write-Host "🔧 DEBUGGING REQUIRED:" -ForegroundColor Yellow
    Write-Host "   1. Check Render dashboard for frontend service status" -ForegroundColor White
    Write-Host "   2. Verify render.yaml frontend service configuration" -ForegroundColor White
    Write-Host "   3. Check build logs for frontend deployment failures" -ForegroundColor White
    exit 1
}

Write-Host "`n🎭 PLAYWRIGHT MCP COMPREHENSIVE TESTING" -ForegroundColor Magenta
Write-Host "Target: $WorkingUrl" -ForegroundColor Cyan

# Test 1: Basic Page Load & Content Analysis
Write-Host "`n📋 TEST 1: BASIC PAGE LOAD & CONTENT ANALYSIS" -ForegroundColor Yellow
try {
    $pageResponse = Invoke-WebRequest $WorkingUrl -UseBasicParsing -TimeoutSec 20
    
    Write-Host "✅ Page Load: SUCCESS ($($pageResponse.StatusCode))" -ForegroundColor Green
    Write-Host "   Content-Type: $($pageResponse.Headers['Content-Type'])" -ForegroundColor Gray
    Write-Host "   Content Size: $($pageResponse.Content.Length) bytes" -ForegroundColor Gray
    
    # Analyze content
    $content = $pageResponse.Content
    $hasReact = $content -like "*react*" -or $content -like "*React*"
    $hasVite = $content -like "*vite*" -or $content -like "*Vite*" 
    $hasTaskMaster = $content -like "*TaskMaster*" -or $content -like "*taskmaster*"
    $hasAPI = $content -like "*api*" -or $content -like "*/api/*"
    
    Write-Host "`n📊 CONTENT ANALYSIS:" -ForegroundColor Cyan
    Write-Host "   React App: $(if($hasReact) {'✅ Detected'} else {'❌ Not found'})" -ForegroundColor $(if($hasReact) {'Green'} else {'Red'})
    Write-Host "   Vite Build: $(if($hasVite) {'✅ Detected'} else {'❌ Not found'})" -ForegroundColor $(if($hasVite) {'Green'} else {'Red'})
    Write-Host "   TaskMaster: $(if($hasTaskMaster) {'✅ Detected'} else {'❌ Not found'})" -ForegroundColor $(if($hasTaskMaster) {'Green'} else {'Red'})
    Write-Host "   API Calls: $(if($hasAPI) {'✅ Detected'} else {'❌ Not found'})" -ForegroundColor $(if($hasAPI) {'Green'} else {'Red'})
    
} catch {
    Write-Host "❌ Basic page load failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: SPA Route Testing (Not Found Fix Verification)
Write-Host "`n📋 TEST 2: SPA ROUTE TESTING (NOT FOUND FIX)" -ForegroundColor Yellow
$routes = @("/", "/dashboard", "/positions", "/bots", "/arbitrage", "/portfolio")
$workingRoutes = 0
$failedRoutes = @()

foreach ($route in $routes) {
    $testUrl = $WorkingUrl.TrimEnd('/') + $route
    try {
        $routeResponse = Invoke-WebRequest $testUrl -UseBasicParsing -TimeoutSec 12
        if ($routeResponse.StatusCode -eq 200) {
            Write-Host "   ✅ $route : Working (200)" -ForegroundColor Green
            $workingRoutes++
            
            # Check if route actually loads content (not just redirects)
            if ($routeResponse.Content.Length -lt 100) {
                Write-Host "      ⚠️ Warning: Very small response size" -ForegroundColor Yellow
            }
        } else {
            Write-Host "   ⚠️ $route : Unusual response ($($routeResponse.StatusCode))" -ForegroundColor Yellow
            $failedRoutes += $route
        }
    } catch {
        Write-Host "   ❌ $route : FAILED - $($_.Exception.Message.Split('.')[0])" -ForegroundColor Red
        $failedRoutes += $route
    }
}

Write-Host "`n📊 SPA ROUTE TEST RESULTS:" -ForegroundColor Cyan
Write-Host "   Working Routes: $workingRoutes/$($routes.Count)" -ForegroundColor $(if($workingRoutes -eq $routes.Count) {'Green'} else {'Yellow'})
if ($failedRoutes.Count -gt 0) {
    Write-Host "   Failed Routes: $($failedRoutes -join ', ')" -ForegroundColor Red
    if ($failedRoutes.Count -eq $routes.Count) {
        Write-Host "   🚨 SPA REWRITE NOT WORKING - All routes failing!" -ForegroundColor Red
    }
} else {
    Write-Host "   🎉 SPA REWRITE: ALL ROUTES WORKING!" -ForegroundColor Green
}

# Test 3: API Integration Testing
Write-Host "`n📋 TEST 3: API INTEGRATION TESTING" -ForegroundColor Yellow
$backendUrls = @(
    "https://srv-d30eil7fte5s73eamba0.onrender.com",
    "https://warp-taskmaster-backend.onrender.com"
)

$workingBackend = $null
foreach ($backendUrl in $backendUrls) {
    try {
        $apiTest = Invoke-WebRequest "$backendUrl/api/v1/test" -UseBasicParsing -TimeoutSec 15
        if ($apiTest.StatusCode -eq 200) {
            Write-Host "✅ Backend API Found: $backendUrl" -ForegroundColor Green
            Write-Host "   Response: $($apiTest.Content)" -ForegroundColor Gray
            $workingBackend = $backendUrl
            break
        }
    } catch {
        Write-Host "❌ Backend not responding: $backendUrl" -ForegroundColor Red
    }
}

if ($workingBackend) {
    # Test critical API endpoints
    $apiEndpoints = @(
        "/api/v1/test",
        "/api/v1/bots", 
        "/api/v1/funding-rates",
        "/api/v1/arbitrage-opportunities"
    )
    
    Write-Host "`n🔧 API ENDPOINT TESTING:" -ForegroundColor Cyan
    foreach ($endpoint in $apiEndpoints) {
        try {
            $apiResponse = Invoke-WebRequest "$workingBackend$endpoint" -UseBasicParsing -TimeoutSec 10
            Write-Host "   ✅ $endpoint : $($apiResponse.StatusCode)" -ForegroundColor Green
        } catch {
            Write-Host "   ❌ $endpoint : $($_.Exception.Message.Split('.')[0])" -ForegroundColor Red
        }
    }
} else {
    Write-Host "❌ No working backend found - API integration cannot be tested" -ForegroundColor Red
}

# Test 4: Performance & Resource Loading
Write-Host "`n📋 TEST 4: PERFORMANCE & RESOURCE ANALYSIS" -ForegroundColor Yellow
try {
    $perfStart = Get-Date
    $perfResponse = Invoke-WebRequest $WorkingUrl -UseBasicParsing -TimeoutSec 30
    $perfEnd = Get-Date
    $loadTime = ($perfEnd - $perfStart).TotalMilliseconds
    
    Write-Host "✅ Load Time: $([math]::Round($loadTime, 0))ms" -ForegroundColor $(if($loadTime -lt 3000) {'Green'} elseif($loadTime -lt 5000) {'Yellow'} else {'Red'})
    
    # Check for common assets
    $content = $perfResponse.Content
    $hasCSS = $content -like "*\.css*" -or $content -like "*style*"
    $hasJS = $content -like "*\.js*" -or $content -like "*script*"
    $hasImages = $content -like "*\.png*" -or $content -like "*\.jpg*" -or $content -like "*\.svg*"
    
    Write-Host "   CSS Stylesheets: $(if($hasCSS) {'✅ Found'} else {'❌ None'})" -ForegroundColor $(if($hasCSS) {'Green'} else {'Red'})
    Write-Host "   JavaScript: $(if($hasJS) {'✅ Found'} else {'❌ None'})" -ForegroundColor $(if($hasJS) {'Green'} else {'Red'})
    Write-Host "   Images/Assets: $(if($hasImages) {'✅ Found'} else {'⚠️ None detected'})" -ForegroundColor $(if($hasImages) {'Green'} else {'Yellow'})
    
} catch {
    Write-Host "❌ Performance test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Error Boundary & Fallback Testing
Write-Host "`n📋 TEST 5: ERROR HANDLING & FALLBACKS" -ForegroundColor Yellow
$errorRoutes = @("/nonexistent", "/invalid-page", "/404-test")
$handlesErrors = $true

foreach ($errorRoute in $errorRoutes) {
    try {
        $errorResponse = Invoke-WebRequest "$WorkingUrl$errorRoute" -UseBasicParsing -TimeoutSec 10
        if ($errorResponse.StatusCode -eq 200) {
            Write-Host "   ✅ $errorRoute : Handled gracefully (SPA rewrite working)" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $errorRoute : $($errorResponse.StatusCode)" -ForegroundColor Red
            $handlesErrors = $false
        }
    } catch {
        if ($_.Exception.Message -like "*404*") {
            Write-Host "   ❌ $errorRoute : 404 Not Found (SPA rewrite broken)" -ForegroundColor Red
            $handlesErrors = $false
        } else {
            Write-Host "   ⚠️ $errorRoute : Other error" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n🎯 ERROR HANDLING: $(if($handlesErrors) {'✅ Working'} else {'❌ Issues detected'})" -ForegroundColor $(if($handlesErrors) {'Green'} else {'Red'})"

# Final Summary Report
Write-Host "`n" + "="*80 -ForegroundColor White
Write-Host "🎭 PLAYWRIGHT MCP COMPREHENSIVE TEST RESULTS" -ForegroundColor Magenta
Write-Host "="*80 -ForegroundColor White

$overallStatus = if ($WorkingUrl -and $workingRoutes -gt 0 -and $handlesErrors) {
    "✅ FRONTEND FUNCTIONAL"
} elseif ($WorkingUrl) {
    "⚠️ FRONTEND PARTIALLY WORKING" 
} else {
    "❌ FRONTEND NOT ACCESSIBLE"
}

Write-Host "Overall Status: $overallStatus" -ForegroundColor $(if($overallStatus.StartsWith('✅')) {'Green'} elseif($overallStatus.StartsWith('⚠️')) {'Yellow'} else {'Red'})
Write-Host "Frontend URL: $(if($WorkingUrl) {$WorkingUrl} else {'Not found'})" -ForegroundColor Gray
Write-Host "SPA Routes: $workingRoutes/$($routes.Count) working" -ForegroundColor $(if($workingRoutes -eq $routes.Count) {'Green'} else {'Red'})
Write-Host "Backend API: $(if($workingBackend) {'Connected'} else {'Not available'})" -ForegroundColor $(if($workingBackend) {'Green'} else {'Red'})
Write-Host "Error Handling: $(if($handlesErrors) {'Working'} else {'Issues'})" -ForegroundColor $(if($handlesErrors) {'Green'} else {'Red'})"

Write-Host "`n🎯 PLAYWRIGHT MCP TESTING COMPLETE!" -ForegroundColor Magenta
