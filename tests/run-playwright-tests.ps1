# ==========================================
# WARP TASKMASTER: Playwright Test Runner
# ==========================================
# Automated UI testing with screenshots and visual proof

param(
    [string]$Browser = "chromium",
    [switch]$Headed = $false,
    [switch]$Debug = $false,
    [switch]$OpenReport = $true,
    [string]$TestPattern = "*",
    [switch]$UpdateBaselines = $false
)

# Configuration
$TestConfig = @{
    FrontendUrl = "http://localhost:4173"
    BackendUrl = "http://localhost:3001/api/v1"
    ReportPath = "tests/reports"
    ScreenshotPath = "tests/reports/screenshots"
    BaselinePath = "tests/reports/visual-baselines"
}

# Colors for output
$Colors = @{
    Info = "White"
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Header = "Cyan"
}

function Write-TestLog {
    param([string]$Message, [string]$Level = "Info")
    Write-Host $Message -ForegroundColor $Colors[$Level]
}

function Test-ServiceAvailability {
    param([string]$Url, [string]$ServiceName)
    
    try {
        $Response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing
        if ($Response.StatusCode -eq 200) {
            Write-TestLog "✅ $ServiceName is available" "Success"
            return $true
        } else {
            Write-TestLog "⚠️  $ServiceName returned status $($Response.StatusCode)" "Warning"
            return $false
        }
    } catch {
        Write-TestLog "❌ $ServiceName not available: $($_.Exception.Message)" "Error"
        return $false
    }
}

function Start-RequiredServices {
    Write-TestLog "🚀 Checking required services..." "Header"
    
    # Check backend
    $BackendAvailable = Test-ServiceAvailability -Url "$($TestConfig.BackendUrl)/test" -ServiceName "Backend"
    
    if (!$BackendAvailable) {
        Write-TestLog "Starting backend server..." "Info"
        Start-Process -FilePath "node" -ArgumentList "backend/server.js" -WindowStyle Hidden
        Start-Sleep -Seconds 5
        $BackendAvailable = Test-ServiceAvailability -Url "$($TestConfig.BackendUrl)/test" -ServiceName "Backend"
    }
    
    # Check frontend
    $FrontendAvailable = Test-ServiceAvailability -Url $TestConfig.FrontendUrl -ServiceName "Frontend"
    
    if (!$FrontendAvailable) {
        Write-TestLog "⚠️  Frontend not available. Starting it now..." "Warning"
        Start-Process -FilePath "npm" -ArgumentList "run", "preview" -WindowStyle Hidden
        Write-TestLog "💤 Waiting 10 seconds for frontend to start..." "Info"
        Start-Sleep -Seconds 10
        $FrontendAvailable = Test-ServiceAvailability -Url $TestConfig.FrontendUrl -ServiceName "Frontend"
    }
    
    return @{
        Backend = $BackendAvailable
        Frontend = $FrontendAvailable
    }
}

function Initialize-TestEnvironment {
    Write-TestLog "🎯 Initializing Playwright Test Environment..." "Header"
    
    # Create directories
    $Directories = @($TestConfig.ReportPath, $TestConfig.ScreenshotPath, $TestConfig.BaselinePath)
    foreach ($Dir in $Directories) {
        if (!(Test-Path $Dir)) {
            New-Item -ItemType Directory -Path $Dir -Force | Out-Null
            Write-TestLog "📁 Created directory: $Dir" "Info"
        }
    }
    
    # Clear old screenshots
    if (Test-Path $TestConfig.ScreenshotPath) {
        Remove-Item "$($TestConfig.ScreenshotPath)/*" -Force -Recurse -ErrorAction SilentlyContinue
        Write-TestLog "🧹 Cleared old screenshots" "Info"
    }
}

function Invoke-PlaywrightTests {
    param([hashtable]$Services)
    
    if (!$Services.Frontend -or !$Services.Backend) {
        Write-TestLog "❌ Cannot run tests - required services not available" "Error"
        return $false
    }
    
    Write-TestLog "🎭 Running Playwright Tests..." "Header"
    
    try {
        # Build test command
        $TestCommand = "npx playwright test"
        
        if ($TestPattern -ne "*") {
            $TestCommand += " --grep `"$TestPattern`""
        }
        
        if ($Browser -ne "chromium") {
            $TestCommand += " --project=$Browser"
        }
        
        if ($Headed) {
            $TestCommand += " --headed"
        }
        
        if ($Debug) {
            $TestCommand += " --debug"
        }
        
        if ($UpdateBaselines) {
            $TestCommand += " --update-snapshots"
        }
        
        Write-TestLog "Executing: $TestCommand" "Info"
        
        # Run tests
        $TestOutput = Invoke-Expression $TestCommand
        $ExitCode = $LASTEXITCODE
        
        # Display output
        Write-Host $TestOutput
        
        if ($ExitCode -eq 0) {
            Write-TestLog "✅ All Playwright tests passed!" "Success"
            return $true
        } else {
            Write-TestLog "❌ Some Playwright tests failed (Exit Code: $ExitCode)" "Error"
            return $false
        }
        
    } catch {
        Write-TestLog "💥 Playwright execution failed: $($_.Exception.Message)" "Error"
        return $false
    }
}

function Open-TestReports {
    if (!$OpenReport) { return }
    
    Write-TestLog "📊 Opening test reports..." "Header"
    
    # Open Playwright HTML report
    $PlaywrightReport = "tests/playwright-report/index.html"
    if (Test-Path $PlaywrightReport) {
        Start-Process $PlaywrightReport
        Write-TestLog "🎭 Playwright report opened" "Success"
    }
    
    # Open screenshot gallery (create simple HTML viewer)
    Create-ScreenshotGallery
    
    $GalleryPath = "tests/reports/screenshot-gallery.html"
    if (Test-Path $GalleryPath) {
        Start-Process $GalleryPath
        Write-TestLog "📸 Screenshot gallery opened" "Success"
    }
}

function Create-ScreenshotGallery {
    if (!(Test-Path $TestConfig.ScreenshotPath)) { return }
    
    $Screenshots = Get-ChildItem $TestConfig.ScreenshotPath -Filter "*.png" | Sort-Object Name
    
    $Html = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WARP TaskMaster - Screenshot Gallery</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', sans-serif; 
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white; padding: 20px; min-height: 100vh;
        }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
        .screenshot-card { 
            background: rgba(255, 255, 255, 0.1); 
            border-radius: 15px; 
            padding: 15px; 
            backdrop-filter: blur(10px);
        }
        .screenshot-card h3 { margin-bottom: 10px; color: #4ecdc4; }
        .screenshot-card img { 
            width: 100%; 
            border-radius: 8px; 
            border: 2px solid rgba(255, 255, 255, 0.2);
            cursor: pointer;
            transition: transform 0.2s;
        }
        .screenshot-card img:hover { transform: scale(1.05); }
        .timestamp { color: #ccc; font-size: 0.9em; text-align: center; margin-top: 20px; }
        .modal { 
            display: none; position: fixed; z-index: 1000; left: 0; top: 0; 
            width: 100%; height: 100%; background: rgba(0,0,0,0.9); 
        }
        .modal img { 
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            max-width: 95%; max-height: 95%; border-radius: 8px;
        }
        .close { 
            position: absolute; top: 20px; right: 30px; color: white; 
            font-size: 40px; font-weight: bold; cursor: pointer; 
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 WARP TaskMaster - Screenshot Gallery</h1>
        <p>Visual Proof of Frontend Testing</p>
        <div class="timestamp">Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</div>
    </div>
    
    <div class="gallery">
"@

    foreach ($Screenshot in $Screenshots) {
        $Name = $Screenshot.BaseName -replace '-', ' ' -replace '_', ' '
        $Name = (Get-Culture).TextInfo.ToTitleCase($Name)
        $RelativePath = "screenshots/$($Screenshot.Name)"
        
        $Html += @"
        <div class="screenshot-card">
            <h3>$Name</h3>
            <img src="$RelativePath" alt="$Name" onclick="openModal('$RelativePath')">
        </div>
"@
    }

    $Html += @"
    </div>
    
    <div id="modal" class="modal" onclick="closeModal()">
        <span class="close" onclick="closeModal()">&times;</span>
        <img id="modal-img">
    </div>
    
    <script>
        function openModal(src) {
            document.getElementById('modal').style.display = 'block';
            document.getElementById('modal-img').src = src;
        }
        function closeModal() {
            document.getElementById('modal').style.display = 'none';
        }
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeModal();
        });
    </script>
</body>
</html>
"@

    $GalleryPath = "tests/reports/screenshot-gallery.html"
    $Html | Out-File -FilePath $GalleryPath -Encoding UTF8
    Write-TestLog "📸 Screenshot gallery created: $GalleryPath" "Success"
}

# ==========================================
# MAIN EXECUTION
# ==========================================

try {
    Write-TestLog "
🎯 ======================================== 🎯
   WARP TASKMASTER - PLAYWRIGHT TESTING
🎯 ======================================== 🎯" "Header"
    
    Write-TestLog "Browser: $Browser" "Info"
    Write-TestLog "Headed: $Headed" "Info"
    Write-TestLog "Test Pattern: $TestPattern" "Info"
    
    # Initialize environment
    Initialize-TestEnvironment
    
    # Start services
    $Services = Start-RequiredServices
    
    if (!$Services.Frontend -or !$Services.Backend) {
        Write-TestLog "❌ Required services not available. Cannot proceed." "Error"
        exit 1
    }
    
    # Run Playwright tests
    $TestsPassed = Invoke-PlaywrightTests -Services $Services
    
    # Open reports
    Open-TestReports
    
    # Final summary
    Write-TestLog "
🎯 PLAYWRIGHT TESTING COMPLETED 🎯
=================================
Browser: $Browser
Frontend: $(if($Services.Frontend){'✅ Available'}else{'❌ Not Available'})
Backend: $(if($Services.Backend){'✅ Available'}else{'❌ Not Available'})
Tests: $(if($TestsPassed){'✅ PASSED'}else{'❌ FAILED'})
Reports: $(if($OpenReport){'🌐 Opened'}else{'📄 Generated'})
" "Header"
    
    if ($TestsPassed) {
        Write-TestLog "🎉 All tests passed! UI is working perfectly!" "Success"
        exit 0
    } else {
        Write-TestLog "❌ Some tests failed. Check the reports for details." "Error"
        exit 1
    }
    
} catch {
    Write-TestLog "💥 Playwright test runner crashed: $($_.Exception.Message)" "Error"
    Write-TestLog $_.ScriptStackTrace "Error"
    exit 1
}
