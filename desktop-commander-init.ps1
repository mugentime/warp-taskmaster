# ==========================================
# DESKTOP COMMANDER INITIALIZATION
# ==========================================
# One-click setup for Desktop Commander

Write-Host ""
Write-Host "DESKTOP COMMANDER SETUP" -ForegroundColor Magenta
Write-Host "=============================="
Write-Host ""

# Check if we're in the right directory
$expectedFiles = @("desktop-commander.ps1", "desktop-commander.config.json", "package.json")
$missingFiles = @()

foreach ($file in $expectedFiles) {
    if (!(Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "Missing required files:" -ForegroundColor Red
    foreach ($file in $missingFiles) {
        Write-Host "  * $file" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please run this script from the warp-taskmaster directory." -ForegroundColor Yellow
    exit 1
}

# Run the main initialization
Write-Host "Initializing Desktop Commander..." -ForegroundColor Cyan
& .\desktop-commander.ps1 /init

Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "================================"
Write-Host ""
Write-Host "1. Check available workspaces:" -ForegroundColor Cyan
Write-Host "   .\desktop-commander.ps1 /status"
Write-Host ""
Write-Host "2. Start your trading workspace:" -ForegroundColor Cyan  
Write-Host "   .\desktop-commander.ps1 /start -Workspace trading"
Write-Host ""
Write-Host "3. Or start development workspace:" -ForegroundColor Cyan
Write-Host "   .\desktop-commander.ps1 /start -Workspace development"
Write-Host ""
Write-Host "4. View all commands:" -ForegroundColor Cyan
Write-Host "   .\desktop-commander.ps1 /help"
Write-Host ""
Write-Host "5. Integration with Taskmaster:" -ForegroundColor Cyan
Write-Host "   .\taskmaster-commands.ps1 /status"
Write-Host ""
Write-Host "Desktop Commander is now ready!" -ForegroundColor Green
Write-Host ""
