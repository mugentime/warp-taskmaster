# ==========================================
# WARP TASKMASTER: Backend Connection Test
# ==========================================
# Comprehensive automated testing for all backend endpoints
# Provides clear pass/fail results with detailed reporting

param(
    [string]$BackendUrl = "http://localhost:3001/api/v1",
    [string]$ReportPath = "tests/reports",
    [switch]$Verbose
)

# Test Configuration
$TestConfig = @{
    Timeout = 10
    VerificationCode = "1234"
    ExpectedAssetCount = 10
    MaxRetries = 3
}

# Create reports directory
if (!(Test-Path $ReportPath)) {
    New-Item -ItemType Directory -Path $ReportPath -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$ReportFile = "$ReportPath/backend-test-$Timestamp.json"
$LogFile = "$ReportPath/backend-test-$Timestamp.log"

# Initialize test results
$TestResults = @{
    Timestamp = Get-Date
    BackendUrl = $BackendUrl
    Tests = @()
    Summary = @{
        Total = 0
        Passed = 0
        Failed = 0
        Warnings = 0
        Duration = 0
    }
}

function Write-TestLog {
    param([string]$Message, [string]$Level = "INFO")
    $LogMessage = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    Add-Content -Path $LogFile -Value $LogMessage
    if ($Verbose -or $Level -eq "ERROR") {
        Write-Host $LogMessage -ForegroundColor $(if($Level -eq "ERROR"){"Red"}elseif($Level -eq "WARN"){"Yellow"}elseif($Level -eq "PASS"){"Green"}else{"White"})
    }
}

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Endpoint,
        [string]$Method = "GET",
        [hashtable]$Headers = @{"Content-Type" = "application/json"},
        [string]$Body = $null,
        [scriptblock]$Validator = $null
    )
    
    $TestResults.Summary.Total++
    $TestStart = Get-Date
    Write-TestLog "Testing: $Name" "INFO"
    
    $TestResult = @{
        Name = $Name
        Endpoint = $Endpoint
        Method = $Method
        StartTime = $TestStart
        Status = "UNKNOWN"
        Duration = 0
        Response = $null
        Error = $null
        Validation = $null
    }
    
    try {
        $RequestParams = @{
            Uri = "$BackendUrl$Endpoint"
            Method = $Method
            Headers = $Headers
            TimeoutSec = $TestConfig.Timeout
        }
        
        if ($Body) {
            $RequestParams.Body = $Body
        }
        
        $Response = Invoke-RestMethod @RequestParams
        $TestResult.Response = $Response
        $TestResult.Duration = ((Get-Date) - $TestStart).TotalMilliseconds
        
        # Run custom validator if provided
        if ($Validator) {
            $ValidationResult = & $Validator $Response
            $TestResult.Validation = $ValidationResult
            
            if ($ValidationResult.Valid) {
                $TestResult.Status = "PASS"
                $TestResults.Summary.Passed++
                Write-TestLog "✅ $Name - PASSED ($(($TestResult.Duration).ToString('F0'))ms)" "PASS"
            } else {
                $TestResult.Status = "FAIL"
                $TestResult.Error = $ValidationResult.Message
                $TestResults.Summary.Failed++
                Write-TestLog "❌ $Name - FAILED: $($ValidationResult.Message)" "ERROR"
            }
        } else {
            $TestResult.Status = "PASS"
            $TestResults.Summary.Passed++
            Write-TestLog "✅ $Name - PASSED ($(($TestResult.Duration).ToString('F0'))ms)" "PASS"
        }
        
    } catch {
        $TestResult.Status = "FAIL"
        $TestResult.Error = $_.Exception.Message
        $TestResult.Duration = ((Get-Date) - $TestStart).TotalMilliseconds
        $TestResults.Summary.Failed++
        Write-TestLog "❌ $Name - FAILED: $($_.Exception.Message)" "ERROR"
    }
    
    $TestResults.Tests += $TestResult
    return $TestResult
}

# ==========================================
# TEST SUITE EXECUTION
# ==========================================

Write-TestLog "🚀 Starting Backend Connection Test Suite" "INFO"
Write-TestLog "Backend URL: $BackendUrl" "INFO"
Write-TestLog "Report will be saved to: $ReportFile" "INFO"

$SuiteStart = Get-Date

# Test 1: Basic Health Check
Test-Endpoint -Name "Health Check" -Endpoint "/test" -Validator {
    param($response)
    if ($response.success -eq $true) {
        return @{ Valid = $true; Message = "Health check passed" }
    } else {
        return @{ Valid = $false; Message = "Health check failed - success not true" }
    }
}

# Test 2: Connection Test with Verification Code
Test-Endpoint -Name "Connection Test" -Endpoint "/test-connection" -Method "POST" -Body '{"verificationCode": "1234"}' -Validator {
    param($response)
    if ($response.success -eq $true -and $response.balance) {
        if ($response.balance.totalAssets -gt 0) {
            return @{ Valid = $true; Message = "Connection successful with $($response.balance.totalAssets) assets found" }
        } else {
            return @{ Valid = $false; Message = "Connection successful but no assets found" }
        }
    } else {
        return @{ Valid = $false; Message = "Connection failed or invalid response format" }
    }
}

# Test 3: Invalid Verification Code
Test-Endpoint -Name "Invalid Verification Code" -Endpoint "/test-connection" -Method "POST" -Body '{"verificationCode": "wrong"}' -Validator {
    param($response)
    if ($response.success -eq $false -and $response.message -like "*Invalid*") {
        return @{ Valid = $true; Message = "Correctly rejected invalid verification code" }
    } else {
        return @{ Valid = $false; Message = "Should have rejected invalid verification code" }
    }
}

# Test 4: Get Active Bots
Test-Endpoint -Name "Get Active Bots" -Endpoint "/bots" -Validator {
    param($response)
    if ($response -is [array]) {
        return @{ Valid = $true; Message = "Bots endpoint returned array with $($response.Count) bots" }
    } else {
        return @{ Valid = $false; Message = "Bots endpoint should return an array" }
    }
}

# Test 5: Rebalancer Status
Test-Endpoint -Name "Rebalancer Status" -Endpoint "/rebalancer/status" -Validator {
    param($response)
    if ($response.enabled -ne $null -and $response.status) {
        return @{ Valid = $true; Message = "Rebalancer status retrieved successfully" }
    } else {
        return @{ Valid = $false; Message = "Rebalancer status missing required fields" }
    }
}

# Test 6: Funding Rates Test
Test-Endpoint -Name "Funding Rates Test" -Endpoint "/test-funding" -Validator {
    param($response)
    if ($response.success -eq $true -and $response.sample -and $response.sample.Count -gt 0) {
        return @{ Valid = $true; Message = "Funding rates retrieved successfully" }
    } else {
        return @{ Valid = $false; Message = "Funding rates test failed or no sample data" }
    }
}

# Calculate final summary
$SuiteDuration = ((Get-Date) - $SuiteStart).TotalSeconds
$TestResults.Summary.Duration = [math]::Round($SuiteDuration, 2)
$SuccessRate = [math]::Round(($TestResults.Summary.Passed / $TestResults.Summary.Total) * 100, 1)

Write-TestLog "
🎯 TEST SUITE COMPLETED 🎯
========================
Total Tests: $($TestResults.Summary.Total)
✅ Passed: $($TestResults.Summary.Passed)
❌ Failed: $($TestResults.Summary.Failed)
⚠️  Warnings: $($TestResults.Summary.Warnings)
📊 Success Rate: $SuccessRate%
⏱️  Duration: $($TestResults.Summary.Duration)s
📄 Report: $ReportFile
" "INFO"

# Save detailed report
$TestResults | ConvertTo-Json -Depth 10 | Out-File -FilePath $ReportFile -Encoding UTF8
Write-TestLog "📄 Detailed report saved to: $ReportFile" "INFO"

# Return exit code based on results
if ($TestResults.Summary.Failed -gt 0) {
    Write-TestLog "❌ Some tests failed. Check the report for details." "ERROR"
    exit 1
} else {
    Write-TestLog "✅ All tests passed successfully!" "PASS"
    exit 0
}
