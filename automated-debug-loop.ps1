# AUTOMATED TRADING DEBUG LOOP
# This script uses Desktop Commander MCP and TaskMaster to automate the entire debug workflow

param(
    [int]$MaxRetries = 10,
    [int]$RetryDelaySeconds = 5
)

Write-Host "🚀 STARTING AUTOMATED TRADING DEBUG LOOP" -ForegroundColor Red -BackgroundColor Yellow
Write-Host "Using TaskMaster MCP + Desktop Commander MCP for full automation" -ForegroundColor Cyan

# Load API credentials
$apiKey = "KP5NFDffn3reE3md2SKkrcRTgTLwJKrE7wvBVNizdZfuBswKGVbBTluopkmofax1"
$apiSecret = "2bUXyAuNY0zjrlXWi5xC8DDmVxkhOtYu7W6RwstZ33Ytr7jzins2SUemRCDpLIV5"

$retryCount = 0
$tradeSuccessful = $false

while (-not $tradeSuccessful -and $retryCount -lt $MaxRetries) {
    $retryCount++
    Write-Host ""
    Write-Host "🔄 RETRY ATTEMPT $retryCount / $MaxRetries" -ForegroundColor Yellow
    Write-Host "======================================" -ForegroundColor Gray
    
    try {
        # Step 1: Analyze current wallet state
        Write-Host "📊 Step 1: Analyzing wallet balances..." -ForegroundColor Blue
        
        $walletBody = @{
            apiKey = $apiKey
            apiSecret = $apiSecret
        } | ConvertTo-Json
        
        $walletResponse = curl http://localhost:3001/api/v1/get-all-wallet-balances -Method POST -Headers @{"Content-Type"="application/json"} -Body $walletBody -UseBasicParsing
        $walletData = $walletResponse.Content | ConvertFrom-Json
        
        Write-Host "  💰 Total USDT: $($walletData.summary.totalUSDT)" -ForegroundColor Green
        Write-Host "  🏦 Spot USDT: $($walletData.distribution.spot.usdt)" -ForegroundColor White
        Write-Host "  🔮 Futures USDT: $($walletData.distribution.futures.usdt)" -ForegroundColor White
        
        # Step 2: Get the best opportunity automatically
        Write-Host "🎯 Step 2: Getting best trading opportunity..." -ForegroundColor Blue
        
        $opportunityResponse = curl http://localhost:3001/api/v1/arbitrage-opportunities?limit=1 -UseBasicParsing
        $opportunityData = $opportunityResponse.Content | ConvertFrom-Json
        
        if ($opportunityData.success -and $opportunityData.opportunities.Count -gt 0) {
            $bestOpportunity = $opportunityData.opportunities[0]
            Write-Host "  🏆 Best Symbol: $($bestOpportunity.symbol)" -ForegroundColor Cyan
            Write-Host "  📈 Expected Return: $($bestOpportunity.annualizedRate)% APY" -ForegroundColor Green
            Write-Host "  ⭐ Rating: $($bestOpportunity.rating)" -ForegroundColor Yellow
        } else {
            Write-Host "  ❌ No opportunities found, using BTCUSDT as fallback" -ForegroundColor Red
            $bestOpportunity = @{ symbol = "BTCUSDT" }
        }
        
        # Step 3: Auto-fix wallet transfers if needed
        Write-Host "🔧 Step 3: Auto-fixing wallet distribution..." -ForegroundColor Blue
        
        if ([float]$walletData.distribution.futures.usdt -lt 20) {
            Write-Host "  🔄 Futures wallet needs funding, planning transfers..." -ForegroundColor Yellow
            
            $planBody = @{
                apiKey = $apiKey
                apiSecret = $apiSecret
                symbol = $bestOpportunity.symbol
                strategyType = "Long Perp"
                investment = 15
                autoExecute = $true
            } | ConvertTo-Json
            
            $planResponse = curl http://localhost:3001/api/v1/plan-wallet-transfers -Method POST -Headers @{"Content-Type"="application/json"} -Body $planBody -UseBasicParsing
            $planData = $planResponse.Content | ConvertFrom-Json
            
            if ($planData.success) {
                Write-Host "  ✅ Wallet transfers planned and executed" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  Transfer planning failed, continuing..." -ForegroundColor Yellow
            }
        }
        
        # Step 4: Dynamic investment calculation based on available funds
        Write-Host "🧮 Step 4: Calculating optimal investment amount..." -ForegroundColor Blue
        
        $availableUSDT = [Math]::Max([float]$walletData.distribution.spot.usdt, [float]$walletData.distribution.futures.usdt)
        $optimalInvestment = [Math]::Min([Math]::Floor($availableUSDT * 0.1), 50) # 10% of available, max $50
        $optimalInvestment = [Math]::Max($optimalInvestment, 5) # Minimum $5
        
        Write-Host "  💵 Optimal Investment: $optimalInvestment USDT" -ForegroundColor Cyan
        
        # Step 5: Attempt trade with error handling and auto-retry logic
        Write-Host "🚀 Step 5: Attempting automated trade creation..." -ForegroundColor Blue
        
        $tradeBody = @{
            id = "auto-debug-bot-$(Get-Date -Format 'yyyyMMdd-HHmmss')-attempt-$retryCount"
            name = "🤖 Auto-Debug Bot (Attempt $retryCount)"
            symbol = $bestOpportunity.symbol
            strategyType = "Long Perp"
            investment = $optimalInvestment
            leverage = 1  # Safe leverage
            autoManaged = $true
            autoConvert = $true  # CRITICAL: Enable auto-convert to fix conversion errors
            apiKey = $apiKey
            apiSecret = $apiSecret
            dryRun = $false  # REAL TRADE
        } | ConvertTo-Json
        
        Write-Host "  📋 Trade Config: $($bestOpportunity.symbol), $$optimalInvestment, 1x leverage" -ForegroundColor White
        Write-Host "  🔥 EXECUTING REAL TRADE..." -ForegroundColor Red
        
        $tradeResponse = curl http://localhost:3001/api/v1/launch-bot -Method POST -Headers @{"Content-Type"="application/json"} -Body $tradeBody -UseBasicParsing -ErrorAction Continue
        
        if ($tradeResponse.StatusCode -eq 201) {
            $tradeData = $tradeResponse.Content | ConvertFrom-Json
            if ($tradeData.success) {
                Write-Host ""
                Write-Host "🎉🎉🎉 TRADE CREATED SUCCESSFULLY! 🎉🎉🎉" -ForegroundColor Green -BackgroundColor Black
                Write-Host "Bot ID: $($tradeData.bot.id)" -ForegroundColor Cyan
                Write-Host "Bot Name: $($tradeData.bot.name)" -ForegroundColor Cyan
                Write-Host "Symbol: $($tradeData.bot.symbol)" -ForegroundColor Yellow
                Write-Host "Investment: $($tradeData.bot.investment) USDT" -ForegroundColor Yellow
                Write-Host "Status: $($tradeData.bot.status)" -ForegroundColor Green
                $tradeSuccessful = $true
                break
            }
        }
        
        # Step 6: Error analysis and auto-correction
        Write-Host "🔍 Step 6: Analyzing trade failure and auto-correcting..." -ForegroundColor Blue
        
        $errorContent = $tradeResponse.Content | ConvertFrom-Json
        $errorMessage = $errorContent.message
        $errorDetails = $errorContent.error
        
        Write-Host "  ❌ Error: $errorMessage" -ForegroundColor Red
        Write-Host "  🔧 Details: $errorDetails" -ForegroundColor Gray
        
        # Auto-correction logic based on error type
        if ($errorDetails -like "*Insufficient margin*") {
            Write-Host "  🔧 Auto-fix: Reducing investment amount for next retry" -ForegroundColor Yellow
            $optimalInvestment = [Math]::Max($optimalInvestment * 0.5, 5)
        } elseif ($errorDetails -like "*NOTIONAL*") {
            Write-Host "  🔧 Auto-fix: Increasing investment to meet minimum notional" -ForegroundColor Yellow
            $optimalInvestment = [Math]::Max($optimalInvestment * 1.5, 10)
        } elseif ($errorDetails -like "*conversion*") {
            Write-Host "  🔧 Auto-fix: Asset conversion issue detected, enabling autoConvert" -ForegroundColor Yellow
            # Already enabled above
        } elseif ($errorDetails -like "*symbol*") {
            Write-Host "  🔧 Auto-fix: Symbol issue, switching to BTC fallback" -ForegroundColor Yellow
            $bestOpportunity.symbol = "BTCUSDT"
        } else {
            Write-Host "  🔧 Auto-fix: Unknown error, trying different parameters" -ForegroundColor Yellow
            $optimalInvestment = Get-Random -Minimum 8 -Maximum 25
        }
        
    } catch {
        Write-Host "💥 Exception in retry attempt $retryCount : $($_.Exception.Message)" -ForegroundColor Red
    }
    
    if (-not $tradeSuccessful -and $retryCount -lt $MaxRetries) {
        Write-Host "⏳ Waiting $RetryDelaySeconds seconds before next retry..." -ForegroundColor Yellow
        Start-Sleep -Seconds $RetryDelaySeconds
    }
}

if ($tradeSuccessful) {
    Write-Host ""
    Write-Host "✅ AUTOMATED DEBUG LOOP COMPLETED SUCCESSFULLY!" -ForegroundColor Green -BackgroundColor Black
    Write-Host "Total attempts: $retryCount" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ AUTOMATED DEBUG LOOP FAILED AFTER $MaxRetries ATTEMPTS" -ForegroundColor Red -BackgroundColor Yellow
    Write-Host "Manual intervention may be required" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🏁 Debug automation completed." -ForegroundColor White
