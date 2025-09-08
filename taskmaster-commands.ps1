# ==========================================
# TASKMASTER SLASH COMMANDS
# ==========================================
# Quick shortcuts for common workflow operations

param([string]$Command = "help")

# Available slash commands
$Commands = @{
    # Core testing workflows
    "/test-connection" = @{
        Description = "Test backend API connection with verification code 1234"
        Script = { & "tests/test-backend-simple.ps1" }
    }
    
    "/full-test" = @{
        Description = "Run complete testing workflow (backend + frontend + visual)"
        Script = { & "taskmaster-workflow.ps1" -Mode "full" -OpenReports }
    }
    
    "/quick-test" = @{
        Description = "Run backend tests only for quick validation"
        Script = { & "taskmaster-workflow.ps1" -Mode "backend-only" }
    }
    
    "/frontend-test" = @{
        Description = "Run frontend and Playwright tests only"
        Script = { & "taskmaster-workflow.ps1" -Mode "frontend-only" -OpenReports }
    }
    
    "/fix-assets" = @{
        Description = "Apply asset table fix and rebuild frontend"
        Script = { & "taskmaster-workflow.ps1" -Mode "frontend-only" -FixAssets -OpenReports }
    }
    
    # Service management
    "/start-backend" = @{
        Description = "Start the backend server"
        Script = { Start-Process -FilePath "node" -ArgumentList "backend/server.js" -WindowStyle Hidden; Write-Host "✅ Backend started" }
    }
    
    "/start-frontend" = @{
        Description = "Build and start the frontend"
        Script = { & npm run all; Write-Host "✅ Frontend started" }
    }
    
    "/kill-services" = @{
        Description = "Stop all Node.js processes"
        Script = { taskkill /f /im node.exe 2>$null; Write-Host "✅ All services stopped" }
    }
    
    # Reporting and analysis
    "/reports" = @{
        Description = "Generate and open all test reports"
        Script = { 
            & node "tests/generate-test-report.cjs"
            Start-Process "tests/reports/test-dashboard.html"
            if (Test-Path "tests/playwright-report/index.html") { Start-Process "tests/playwright-report/index.html" }
            Write-Host "✅ Reports opened"
        }
    }
    
    "/playwright" = @{
        Description = "Run Playwright visual tests with browser"
        Script = { & npx playwright test --config=playwright.config.cjs tests/playwright/account-status.spec.cjs --project=chromium --headed }
    }
    
    "/playwright-reports" = @{
        Description = "Open Playwright test reports"
        Script = { & npx playwright show-report tests/playwright-report }
    }
    
    # Validation and debugging
    "/validate-api" = @{
        Description = "Quick API endpoint validation"
        Script = { 
            Write-Host "Testing API endpoints..."
            $response = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/test" -UseBasicParsing
            Write-Host "✅ Health: $($response.StatusCode)"
            $response2 = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/test-connection" -Method POST -Body '{"verificationCode":"1234"}' -ContentType "application/json" -UseBasicParsing
            Write-Host "✅ Connection: $($response2.StatusCode)"
        }
    }
    
    "/status" = @{
        Description = "Show current system status"
        Script = {
            Write-Host ""
            Write-Host "🎯 TASKMASTER SYSTEM STATUS" -ForegroundColor Magenta
            Write-Host "=========================="
            
            # Check backend
            try {
                $backend = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/test" -TimeoutSec 3 -UseBasicParsing
                Write-Host "Backend API: ✅ ONLINE (Port 3001)" -ForegroundColor Green
            } catch {
                Write-Host "Backend API: ❌ OFFLINE" -ForegroundColor Red
            }
            
            # Check frontend
            try {
                $frontend = Invoke-WebRequest -Uri "http://localhost:4173" -TimeoutSec 3 -UseBasicParsing
                Write-Host "Frontend App: ✅ ONLINE (Port 4173)" -ForegroundColor Green
            } catch {
                Write-Host "Frontend App: ❌ OFFLINE" -ForegroundColor Red
            }
            
            # Check API connection
            try {
                $api = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/test-connection" -Method POST -Body '{"verificationCode":"1234"}' -ContentType "application/json" -TimeoutSec 5 -UseBasicParsing
                $data = $api.Content | ConvertFrom-Json
                if ($data.success) {
                    Write-Host "Binance API: ✅ CONNECTED ($($data.balance.totalAssets) assets)" -ForegroundColor Green
                } else {
                    Write-Host "Binance API: ❌ FAILED" -ForegroundColor Red
                }
            } catch {
                Write-Host "Binance API: ❌ NO CONNECTION" -ForegroundColor Red
            }
            
            Write-Host ""
        }
    }
    
    # Utilities
    "/reset" = @{
        Description = "Reset environment - stop services, clear cache, restart"
        Script = { 
            & taskkill /f /im node.exe 2>$null
            if (Test-Path "tests/reports") { Remove-Item "tests/reports/*" -Recurse -Force -ErrorAction SilentlyContinue }
            if (Test-Path "test-results") { Remove-Item "test-results" -Recurse -Force -ErrorAction SilentlyContinue }
            Write-Host "✅ Environment reset - ready for fresh start"
        }
    }
    
    "/help" = @{
        Description = "Show all available commands"
        Script = { }  # Handled specially below
    }
}

# Execute command
if ($Commands.ContainsKey($Command) -or $Command -eq "help") {
    if ($Command -eq "help" -or $Command -eq "/help") {
        Write-Host ""
        Write-Host "🎯 TASKMASTER SLASH COMMANDS" -ForegroundColor Magenta
        Write-Host "============================="
        Write-Host ""
        Write-Host "CORE TESTING:" -ForegroundColor Cyan
        Write-Host "  /test-connection   - Test backend API connection"
        Write-Host "  /full-test         - Complete workflow (backend + frontend + visual)"
        Write-Host "  /quick-test        - Backend tests only (fast validation)"
        Write-Host "  /frontend-test     - Frontend + Playwright tests"
        Write-Host "  /fix-assets        - Apply asset table fix + rebuild"
        Write-Host ""
        Write-Host "SERVICE MANAGEMENT:" -ForegroundColor Cyan  
        Write-Host "  /start-backend     - Start backend server"
        Write-Host "  /start-frontend    - Build and start frontend"
        Write-Host "  /kill-services     - Stop all services"
        Write-Host "  /status           - Show system status"
        Write-Host ""
        Write-Host "REPORTS & ANALYSIS:" -ForegroundColor Cyan
        Write-Host "  /reports          - Generate and open test reports"
        Write-Host "  /playwright       - Run visual tests with browser"
        Write-Host "  /playwright-reports - Open Playwright reports"
        Write-Host ""
        Write-Host "UTILITIES:" -ForegroundColor Cyan
        Write-Host "  /validate-api     - Quick API validation"
        Write-Host "  /reset            - Reset environment"
        Write-Host "  /help             - Show this help"
        Write-Host ""
        Write-Host "USAGE EXAMPLES:" -ForegroundColor Yellow
        Write-Host "  taskmaster-commands.ps1 /test-connection"
        Write-Host "  taskmaster-commands.ps1 /full-test"
        Write-Host "  taskmaster-commands.ps1 /status"
        Write-Host ""
        return
    }
    
    Write-Host "🎯 Executing: $Command" -ForegroundColor Cyan
    Write-Host "Description: $($Commands[$Command].Description)" -ForegroundColor Gray
    Write-Host ""
    
    try {
        & $Commands[$Command].Script
    } catch {
        Write-Host "❌ Command failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Unknown command: $Command" -ForegroundColor Red
    Write-Host "Run 'taskmaster-commands.ps1 /help' to see available commands" -ForegroundColor Yellow
}
