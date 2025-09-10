# Playwright MCP - Simple Initialization Script
# Initiates Playwright MCP for comprehensive frontend testing

Write-Host "PLAYWRIGHT MCP - INITIALIZATION" -ForegroundColor Magenta
Write-Host "================================" -ForegroundColor Magenta

# Check if Playwright is already installed
Write-Host "`nChecking Playwright installation..." -ForegroundColor Yellow

try {
    $playwrightCheck = npm list playwright --global 2>$null
    if ($playwrightCheck -like "*playwright*") {
        Write-Host "Playwright globally installed" -ForegroundColor Green
    } else {
        Write-Host "Installing Playwright globally..." -ForegroundColor Yellow
        npm install -g playwright
        npx playwright install
    }
} catch {
    Write-Host "Installing Playwright..." -ForegroundColor Yellow
    npm install -g playwright
    npx playwright install
}

# Initialize Playwright MCP Server
Write-Host "`nStarting Playwright MCP server..." -ForegroundColor Yellow

# Try the official Microsoft Playwright MCP
try {
    Write-Host "Trying @playwright/mcp" -ForegroundColor Gray
    
    # Start in background per user rules
    $job = Start-Job -ScriptBlock {
        npx -y @playwright/mcp
    }
    Start-Sleep 3
    
    if ($job.State -eq "Running") {
        Write-Host "PLAYWRIGHT MCP SERVER STARTED SUCCESSFULLY" -ForegroundColor Green
        Write-Host "Job ID: $($job.Id)" -ForegroundColor Gray
        Write-Host "Ready for browser automation and testing" -ForegroundColor Gray
    } else {
        Write-Host "Failed to start @playwright/mcp" -ForegroundColor Red
        Remove-Job $job -Force
        
        # Fallback: Install playwright core
        Write-Host "Installing Playwright core as fallback..." -ForegroundColor Yellow
        npm install playwright-core
        Write-Host "Playwright core installed" -ForegroundColor Green
    }
} catch {
    Write-Host "Error initializing Playwright MCP: $($_.Exception.Message)" -ForegroundColor Red
    
    # Fallback approach
    try {
        npm install playwright-core
        Write-Host "Playwright core installed as fallback" -ForegroundColor Green
    } catch {
        Write-Host "All Playwright initialization attempts failed" -ForegroundColor Red
    }
}

Write-Host "`nPLAYWRIGHT MCP INITIALIZATION COMPLETE" -ForegroundColor Magenta
