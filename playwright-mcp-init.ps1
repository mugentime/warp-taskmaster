# Playwright MCP - Initialization Script
# Initiates Playwright MCP for comprehensive frontend testing

Write-Host "🎭 PLAYWRIGHT MCP - INITIALIZATION" -ForegroundColor Magenta
Write-Host "================================================================" -ForegroundColor Magenta

# Check if Playwright is already installed
Write-Host "`n🔍 CHECKING PLAYWRIGHT INSTALLATION..." -ForegroundColor Yellow

try {
    $playwrightCheck = npm list playwright --global 2>$null
    if ($playwrightCheck -like "*playwright*") {
        Write-Host "✅ Playwright globally installed" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Installing Playwright globally..." -ForegroundColor Yellow
        npm install -g playwright
        npx playwright install
    }
} catch {
    Write-Host "⚠️ Installing Playwright..." -ForegroundColor Yellow
    npm install -g playwright
    npx playwright install
}

# Initialize Playwright MCP Server
Write-Host "`n🚀 STARTING PLAYWRIGHT MCP SERVER..." -ForegroundColor Yellow

# Try multiple Playwright MCP packages
$mcpPackages = @(
    "@playwright/mcp",
    "better-playwright-mcp",
    "@executeautomation/playwright-mcp-server"
)

$mcpStarted = $false
foreach ($package in $mcpPackages) {
    try {
        Write-Host "Trying: $package" -ForegroundColor Gray
        
        # Start in background per user rules
        $process = Start-Process -FilePath "npx" -ArgumentList "-y", $package -PassThru -WindowStyle Hidden
        Start-Sleep 3
        
        if ($process -and !$process.HasExited) {
            Write-Host "✅ PLAYWRIGHT MCP SERVER STARTED: $package" -ForegroundColor Green
            Write-Host "   Process ID: $($process.Id)" -ForegroundColor Gray
            $mcpStarted = $true
            break
        }
    } catch {
        Write-Host "❌ Failed to start: $package" -ForegroundColor Red
    }
}

if ($mcpStarted) {
    Write-Host "`n🎯 PLAYWRIGHT MCP SUCCESSFULLY INITIATED!" -ForegroundColor Green
    Write-Host "   Ready for browser automation and testing" -ForegroundColor Gray
    Write-Host "   Available for frontend debugging and interaction" -ForegroundColor Gray
} else {
    Write-Host "`n❌ PLAYWRIGHT MCP INITIALIZATION FAILED" -ForegroundColor Red
    Write-Host "   Trying alternative approach..." -ForegroundColor Yellow
    
    # Fallback: Try to run basic Playwright commands
    try {
        npm install playwright-core
        Write-Host "✅ Playwright core installed as fallback" -ForegroundColor Green
    } catch {
        Write-Host "❌ All Playwright MCP initialization attempts failed" -ForegroundColor Red
    }
}

Write-Host "`n🎭 PLAYWRIGHT MCP INITIALIZATION COMPLETE!" -ForegroundColor Magenta
