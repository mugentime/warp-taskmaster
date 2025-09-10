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
        $backendTest = Invoke-WebRequest "$BACKEND_URL/api/v1/test" -UseBasicParsing -TimeoutSec 30
        Write-Host "   ✅ Backend Health: $($backendTest.StatusCode) - SUCCESS" -ForegroundColor Green
        Write-Host "   Response: $($backendTest.Content.Substring(0, [Math]::Min(100, $backendTest.Content.Length)))" -ForegroundColor Gray
        $script:backendHealthy = $true
    } catch {
        Write-Host "   ❌ Backend Health Error: $($_.Exception.Message)" -ForegroundColor Red
        $script:backendHealthy = $false
    }
    
    # Test Backend Root
    Write-Host "2. Testing Backend Root..."
    try {
        $rootTest = Invoke-WebRequest "$BACKEND_URL/" -UseBasicParsing -TimeoutSec 30
        Write-Host "   ✅ Backend Root: $($rootTest.StatusCode)" -ForegroundColor Green
        $script:backendRoot = $true
    } catch {
        Write-Host "   ❌ Backend Root Error: $($_.Exception.Message)" -ForegroundColor Red
        $script:backendRoot = $false
    }
    
    # Test specific API endpoints to understand what's working
    Write-Host "3. Testing API Endpoints..."
    $endpoints = @("/", "/health", "/status", "/api", "/api/v1", "/api/v1/bots")
    foreach ($endpoint in $endpoints) {
        try {
            $test = Invoke-WebRequest "$BACKEND_URL$endpoint" -UseBasicParsing -TimeoutSec 10
            Write-Host "   ✅ $endpoint : $($test.StatusCode)" -ForegroundColor Green
        } catch {
            Write-Host "   ❌ $endpoint : $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        }
    }
    
    return ($script:backendHealthy -or $script:backendRoot)
}

function Show-TaskMasterAnalysis {
    param($success)
    
    Write-Host "`n🤖 TASKMASTER ANALYSIS:" -ForegroundColor Cyan
    if ($success) {
        Write-Host "   ✅ Some endpoints are responding" -ForegroundColor Green
        Write-Host "   🔍 Service is deployed but may have routing issues" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ Service not responding to any requests" -ForegroundColor Red
        Write-Host "   🔍 Possible issues:" -ForegroundColor Yellow
        Write-Host "      - Service still building/starting" -ForegroundColor Gray
        Write-Host "      - Build failed" -ForegroundColor Gray
        Write-Host "      - Environment variables missing" -ForegroundColor Gray
        Write-Host "      - PORT binding issues" -ForegroundColor Gray
    }
}

function Get-DetailedDiagnostics {
    Write-Host "`n🔍 DETAILED DIAGNOSTICS:" -ForegroundColor Magenta
    
    # Check if it's a static site vs web service
    Write-Host "Testing if this might be a static site..."
    try {
        $staticTest = Invoke-WebRequest "$BACKEND_URL" -UseBasicParsing -TimeoutSec 15
        $contentType = $staticTest.Headers['Content-Type']
        Write-Host "   Content-Type: $contentType" -ForegroundColor Gray
        
        if ($contentType -like "*text/html*") {
            Write-Host "   🎯 This appears to be a STATIC SITE, not the backend!" -ForegroundColor Yellow
            Write-Host "   💡 You may have provided the frontend service ID instead" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "   Service completely unresponsive" -ForegroundColor Red
    }
    
    # Test common patterns
    Write-Host "`nTesting common Render patterns..."
    $patterns = @(
        "/",
        "/index.html", 
        "/health",
        "/healthcheck",
        "/ping",
        "/status"
    )
    
    foreach ($pattern in $patterns) {
        try {
            $test = Invoke-WebRequest "$BACKEND_URL$pattern" -UseBasicParsing -TimeoutSec 10
            Write-Host "   ✅ $pattern responds: $($test.StatusCode)" -ForegroundColor Green
        } catch {
            # Silently continue
        }
    }
}

# Main debugging loop
$attempt = 1
$maxAttempts = 20

Write-Host "`n🚀 Starting TaskMaster debugging loop..." -ForegroundColor White
Write-Host "Will check every 30 seconds for up to $maxAttempts cycles" -ForegroundColor Gray

while ($attempt -le $maxAttempts) {
    Write-Host "`n" + "="*60 -ForegroundColor White
    Write-Host "🔄 DEBUGGING CYCLE #$attempt of $maxAttempts" -ForegroundColor White
    Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host "="*60 -ForegroundColor White
    
    $success = Test-RenderDeployment
    Show-TaskMasterAnalysis -success $success
    
    if (-not $success) {
        Get-DetailedDiagnostics
    }
    
    if ($success) {
        Write-Host "`n🎉 SERVICE IS RESPONDING! Moving to endpoint validation..." -ForegroundColor Green
        
        # Test the actual API we need
        Write-Host "`n🔍 VALIDATING REQUIRED ENDPOINTS:" -ForegroundColor Cyan
        $criticalEndpoints = @(
            "/api/v1/test",
            "/api/v1/bots", 
            "/api/v1/funding-rates"
        )
        
        foreach ($endpoint in $criticalEndpoints) {
            try {
                $test = Invoke-WebRequest "$BACKEND_URL$endpoint" -UseBasicParsing -TimeoutSec 15
                Write-Host "   ✅ $endpoint : $($test.StatusCode) - WORKING" -ForegroundColor Green
            } catch {
                Write-Host "   ❌ $endpoint : $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        
        Write-Host "`n✅ TASKMASTER DEBUG LOOP COMPLETE - Service is responding!" -ForegroundColor Green
        break
    }
    
    if ($attempt -lt $maxAttempts) {
        Write-Host "`n⏳ Waiting 30 seconds before next cycle..." -ForegroundColor Gray
        Start-Sleep -Seconds 30
    }
    
    $attempt++
}

if ($attempt -gt $maxAttempts) {
    Write-Host "`n⚠️ MAX ATTEMPTS REACHED - Manual intervention required" -ForegroundColor Red
    Write-Host "🔧 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Check Render dashboard build logs" -ForegroundColor White
    Write-Host "   2. Verify environment variables are set" -ForegroundColor White
    Write-Host "   3. Confirm this is the backend service (not frontend)" -ForegroundColor White
    Write-Host "   4. Check if deployment is still in progress" -ForegroundColor White
}

Write-Host "`n🎯 TaskMaster debugging protocol complete." -ForegroundColor Cyan
