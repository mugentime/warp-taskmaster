# ==========================================
# WARP TASKMASTER: Complete Test Suite Runner
# ==========================================
# Automated test execution with scheduling and monitoring

param(
    [switch]$Continuous,
    [int]$IntervalMinutes = 15,
    [switch]$GenerateReport = $true,
    [switch]$OpenReport = $false,
    [switch]$Verbose = $true
)

# Configuration
$TestConfig = @{
    BackendUrl = "http://localhost:3001/api/v1"
    FrontendUrl = "http://localhost:4173"
    ReportPath = "tests/reports"
    MaxRetries = 3
    RetryDelay = 5
}

# Ensure reports directory exists
if (!(Test-Path $TestConfig.ReportPath)) {
    New-Item -ItemType Directory -Path $TestConfig.ReportPath -Force | Out-Null
}

function Write-TestLog {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] [$Level] $Message"
    
    $Color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "PASS" { "Green" }
        "INFO" { "White" }
        default { "White" }
    }
    
    Write-Host $LogMessage -ForegroundColor $Color
}

function Test-ServiceAvailability {
    param([string]$Url, [string]$ServiceName)
    
    try {
        Write-TestLog "Checking $ServiceName availability..." "INFO"
        $Response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing
        
        if ($Response.StatusCode -eq 200) {
            Write-TestLog "✅ $ServiceName is available" "PASS"
            return $true
        } else {
            Write-TestLog "⚠️  $ServiceName returned status $($Response.StatusCode)" "WARN"
            return $false
        }
    } catch {
        Write-TestLog "❌ $ServiceName is not available: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Start-Services {
    Write-TestLog "🚀 Starting required services..." "INFO"
    
    # Check if backend is running
    $BackendRunning = Test-ServiceAvailability -Url "$($TestConfig.BackendUrl)/test" -ServiceName "Backend"
    
    if (!$BackendRunning) {
        Write-TestLog "Starting backend server..." "INFO"
        try {
            Start-Process -FilePath "node" -ArgumentList "backend/server.js" -WindowStyle Hidden
            Start-Sleep -Seconds 5
            $BackendRunning = Test-ServiceAvailability -Url "$($TestConfig.BackendUrl)/test" -ServiceName "Backend"
        } catch {
            Write-TestLog "Failed to start backend: $($_.Exception.Message)" "ERROR"
        }
    }
    
    # Check if frontend is running
    $FrontendRunning = Test-ServiceAvailability -Url $TestConfig.FrontendUrl -ServiceName "Frontend"
    
    if (!$FrontendRunning) {
        Write-TestLog "Frontend not running. Please start it manually with 'npm run all'" "WARN"
    }
    
    return @{ Backend = $BackendRunning; Frontend = $FrontendRunning }
}

function Invoke-BackendTests {
    Write-TestLog "🖥️  Running Backend Tests..." "INFO"
    
    try {
        $Result = & "tests/backend-connection-test.ps1" -BackendUrl $TestConfig.BackendUrl -Verbose:$Verbose
        $ExitCode = $LASTEXITCODE
        
        if ($ExitCode -eq 0) {
            Write-TestLog "✅ Backend tests completed successfully" "PASS"
            return $true
        } else {
            Write-TestLog "❌ Backend tests failed (Exit Code: $ExitCode)" "ERROR"
            return $false
        }
    } catch {
        Write-TestLog "❌ Failed to run backend tests: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Invoke-FrontendTests {
    Write-TestLog "🌐 Running Frontend Tests..." "INFO"
    
    try {
        $Result = & node "tests/frontend-connection-test.js" $TestConfig.FrontendUrl $TestConfig.BackendUrl
        $ExitCode = $LASTEXITCODE
        
        if ($ExitCode -eq 0) {
            Write-TestLog "✅ Frontend tests completed successfully" "PASS"
            return $true
        } else {
            Write-TestLog "❌ Frontend tests failed (Exit Code: $ExitCode)" "ERROR"
            return $false
        }
    } catch {
        Write-TestLog "❌ Failed to run frontend tests: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Invoke-ReportGeneration {
    if (!$GenerateReport) { return }
    
    Write-TestLog "📊 Generating test reports..." "INFO"
    
    try {
        $Result = & node "tests/generate-test-report.js"
        Write-TestLog "✅ Test report generated successfully" "PASS"
        
        if ($OpenReport) {
            $ReportPath = Join-Path $TestConfig.ReportPath "test-dashboard.html"
            if (Test-Path $ReportPath) {
                Start-Process $ReportPath
                Write-TestLog "🌐 Test report opened in browser" "INFO"
            }
        }
    } catch {
        Write-TestLog "⚠️  Failed to generate report: $($_.Exception.Message)" "WARN"
    }
}

function Invoke-FullTestSuite {
    $SuiteStart = Get-Date
    
    Write-TestLog "
🎯 ===================================== 🎯
   WARP TASKMASTER - FULL TEST SUITE
🎯 ===================================== 🎯" "INFO"
    
    Write-TestLog "Suite started at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "INFO"
    
    # Start services
    $Services = Start-Services
    $ServicesOk = $Services.Backend -and $Services.Frontend
    
    if (!$ServicesOk) {
        Write-TestLog "⚠️  Some services are not available. Tests may fail." "WARN"
    }
    
    # Run tests
    $TestResults = @{
        Backend = $false
        Frontend = $false
        StartTime = $SuiteStart
        Duration = 0
    }
    
    # Backend Tests
    if ($Services.Backend) {
        $TestResults.Backend = Invoke-BackendTests
    } else {
        Write-TestLog "⏭️  Skipping backend tests - service not available" "WARN"
    }
    
    # Frontend Tests  
    if ($Services.Frontend -and $Services.Backend) {
        $TestResults.Frontend = Invoke-FrontendTests
    } else {
        Write-TestLog "⏭️  Skipping frontend tests - required services not available" "WARN"
    }
    
    # Calculate duration
    $TestResults.Duration = ((Get-Date) - $SuiteStart).TotalSeconds
    
    # Generate reports
    Invoke-ReportGeneration
    
    # Summary
    $BackendPassed = if ($TestResults.Backend) { 1 } else { 0 }
    $FrontendPassed = if ($TestResults.Frontend) { 1 } else { 0 }
    $TotalTests = 2
    $PassedTests = $BackendPassed + $FrontendPassed
    $SuccessRate = if ($TotalTests -gt 0) { ($PassedTests / $TotalTests) * 100 } else { 0 }
    
    Write-TestLog "
🎯 TEST SUITE COMPLETED 🎯
========================
Backend Tests: $(if($TestResults.Backend){'✅ PASS'}else{'❌ FAIL'})
Frontend Tests: $(if($TestResults.Frontend){'✅ PASS'}else{'❌ FAIL'})
Success Rate: $([math]::Round($SuccessRate, 1))%
Duration: $([math]::Round($TestResults.Duration, 2))s
Completed: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "INFO"
    
    return $TestResults
}

function Invoke-ContinuousMonitoring {
    Write-TestLog "🔄 Starting continuous monitoring (every $IntervalMinutes minutes)" "INFO"
    Write-TestLog "Press Ctrl+C to stop" "INFO"
    
    $RunCount = 0
    
    try {
        while ($true) {
            $RunCount++
            Write-TestLog "
🔄 === MONITORING RUN #$RunCount ===" "INFO"
            
            $Results = Invoke-FullTestSuite
            
            if ($Results.Backend -and $Results.Frontend) {
                Write-TestLog "✅ All systems healthy" "PASS"
            } else {
                Write-TestLog "⚠️  Issues detected - check logs" "WARN"
            }
            
            Write-TestLog "💤 Sleeping for $IntervalMinutes minutes..." "INFO"
            Start-Sleep -Seconds ($IntervalMinutes * 60)
        }
    } catch {
        Write-TestLog "🛑 Continuous monitoring stopped: $($_.Exception.Message)" "INFO"
    }
}

# ==========================================
# MAIN EXECUTION
# ==========================================

try {
    Write-TestLog "🎯 WARP TaskMaster Test Suite Starting..." "INFO"
    
    if ($Continuous) {
        Invoke-ContinuousMonitoring
    } else {
        $Results = Invoke-FullTestSuite
        
        # Exit with appropriate code
        if ($Results.Backend -and $Results.Frontend) {
            Write-TestLog "🎉 All tests passed! System is healthy." "PASS"
            exit 0
        } else {
            Write-TestLog "❌ Some tests failed. Check the reports for details." "ERROR"
            exit 1
        }
    }
    
} catch {
    Write-TestLog "💥 Test suite crashed: $($_.Exception.Message)" "ERROR"
    Write-TestLog $_.ScriptStackTrace "ERROR"
    exit 1
}
