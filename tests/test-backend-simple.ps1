# Simple Backend Connection Test
param([string]$BackendUrl = "http://localhost:3001/api/v1")

Write-Host "[INFO] Testing Backend Connection..." -ForegroundColor White
Write-Host "[INFO] Backend URL: $BackendUrl" -ForegroundColor White

try {
    # Test 1: Health Check
    Write-Host "[TEST] Health Check..." -ForegroundColor Yellow
    $Response = Invoke-RestMethod -Uri "$BackendUrl/test" -TimeoutSec 10
    if ($Response.success) {
        Write-Host "[PASS] Health Check - OK" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Health Check - Failed" -ForegroundColor Red
        exit 1
    }

    # Test 2: Connection Test
    Write-Host "[TEST] Connection Test with verification code..." -ForegroundColor Yellow
    $Body = '{"verificationCode": "1234"}'
    $Response = Invoke-RestMethod -Uri "$BackendUrl/test-connection" -Method POST -Body $Body -ContentType "application/json" -TimeoutSec 10
    
    if ($Response.success -and $Response.balance) {
        Write-Host "[PASS] Connection Test - OK" -ForegroundColor Green
        Write-Host "[INFO] Assets Found: $($Response.balance.totalAssets)" -ForegroundColor Cyan
        Write-Host "[INFO] Total Value: $($Response.balance.totalValueUSDT) USDT" -ForegroundColor Cyan
        
        if ($Response.balance.detailedBalances) {
            Write-Host "[INFO] Asset List:" -ForegroundColor Cyan
            foreach ($asset in $Response.balance.detailedBalances) {
                Write-Host "  - $($asset.asset): $($asset.total) ($($asset.valueUSDT) USDT)" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "[FAIL] Connection Test - No balance data" -ForegroundColor Red
        exit 1
    }

    # Test 3: Invalid Code Test
    Write-Host "[TEST] Invalid verification code test..." -ForegroundColor Yellow
    $Body = '{"verificationCode": "invalid"}'
    try {
        $Response = Invoke-RestMethod -Uri "$BackendUrl/test-connection" -Method POST -Body $Body -ContentType "application/json" -TimeoutSec 10
        Write-Host "[FAIL] Invalid code should have been rejected" -ForegroundColor Red
        exit 1
    } catch {
        Write-Host "[PASS] Invalid code properly rejected" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "ALL BACKEND TESTS PASSED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "Connection to Binance API: VERIFIED" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    exit 0

} catch {
    Write-Host "[ERROR] Test failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
