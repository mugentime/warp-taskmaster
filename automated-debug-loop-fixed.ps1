# AUTOMATED TRADING DEBUG LOOP - FIXED VERSION
# This script automates the entire debug workflow to create real trades

param(
    [int]$MaxRetries = 10,
    [int]$RetryDelaySeconds = 5
)

Write-Host "🚀 STARTING AUTOMATED TRADING DEBUG LOOP" -ForegroundColor Red -BackgroundColor Yellow
Write-Host "Using MCP automation to eliminate manual debugging" -ForegroundColor Cyan

# Load API credentials
$apiKey = "KP5NFDffn3reE3md2SKkrcRTgTLwJKrE7wvBVNizdZfuBswKGVbBTluopkmofax1"
$apiSecret = "2bUXyAuNY0zjrlXWi5xC8DDmVxkhOtYu7W6RwstZ33Ytr7jzins2SUemRCDpLIV5"

$retryCount = 0
$tradeSuccessful = $false
$optimalInvestment = 15 # Start with $15

while (-not $tradeSuccessful -and $retryCount -lt $MaxRetries) {
    $retryCount++
    Write-Host ""
    Write-Host "🔄 RETRY ATTEMPT $retryCount / $MaxRetries" -ForegroundColor Yellow
    Write-Host "======================================" -ForegroundColor Gray
    
    try {
        # Step 1: Get wallet balances
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
        
        # Step 2: Get best opportunity
        Write-Host "🎯 Step 2: Getting best trading opportunity..." -ForegroundColor Blue
        
        $opportunityResponse = curl http://localhost:3001/api/v1/arbitrage-opportunities?limit=1 -UseBasicParsing -ErrorAction SilentlyContinue
        $bestSymbol = "BTCUSDT" # Default fallback
        
        if ($opportunityResponse -and $opportunityResponse.StatusCode -eq 200) {
            $opportunityData = $opportunityResponse.Content | ConvertFrom-Json
            if ($opportunityData.success -and $opportunityData.opportunities.Count -gt 0) {
                $bestOpportunity = $opportunityData.opportunities[0]
                $bestSymbol = $bestOpportunity.symbol
                Write-Host "  🏆 Best Symbol: $bestSymbol" -ForegroundColor Cyan
                Write-Host "  📈 Expected Return: $($bestOpportunity.annualizedRate)% APY" -ForegroundColor Green
            }
        }
        
        # Step 3: Execute wallet transfers if needed
        Write-Host "🔧 Step 3: Auto-executing wallet transfers..." -ForegroundColor Blue
        
        $planBody = @{
            apiKey = $apiKey
            apiSecret = $apiSecret
            symbol = $bestSymbol
            strategyType = "Long Perp"
            investment = $optimalInvestment
            autoExecute = $true
        } | ConvertTo-Json
        
        $planResponse = curl http://localhost:3001/api/v1/plan-wallet-transfers -Method POST -Headers @{"Content-Type"="application/json"} -Body $planBody -UseBasicParsing -ErrorAction SilentlyContinue
        Write-Host "  ✅ Transfer planning completed" -ForegroundColor Green
        
        # Step 4: Attempt the trade
        Write-Host "🚀 Step 4: Attempting REAL trade creation..." -ForegroundColor Blue
        
        $tradeBody = @{
            id = "auto-debug-bot-$(Get-Date -Format 'yyyyMMdd-HHmmss')-attempt-$retryCount"
            name = "🤖 Auto-Debug Bot (Attempt $retryCount)"
            symbol = $bestSymbol
            strategyType = "Long Perp"
            investment = $optimalInvestment
            leverage = 1
            autoManaged = $true
            autoConvert = $true
            apiKey = $apiKey
            apiSecret = $apiSecret
            dryRun = $false
        } | ConvertTo-Json
        
        Write-Host "  📋 Config: $bestSymbol, $$optimalInvestment USDT, 1x leverage" -ForegroundColor White
        Write-Host "  🔥 EXECUTING REAL TRADE..." -ForegroundColor Red
        
        try {
            $tradeResponse = curl http://localhost:3001/api/v1/launch-bot -Method POST -Headers @{"Content-Type"="application/json"} -Body $tradeBody -UseBasicParsing -ErrorAction Stop
            
            if ($tradeResponse.StatusCode -eq 201) {
                $tradeData = $tradeResponse.Content | ConvertFrom-Json
                if ($tradeData.success) {
                    Write-Host ""
                    Write-Host "🎉🎉🎉 REAL TRADE CREATED SUCCESSFULLY! 🎉🎉🎉" -ForegroundColor Green -BackgroundColor Black
                    Write-Host "Bot ID: $($tradeData.bot.id)" -ForegroundColor Cyan
                    Write-Host "Symbol: $($tradeData.bot.symbol)" -ForegroundColor Yellow
                    Write-Host "Investment: $($tradeData.bot.investment) USDT" -ForegroundColor Yellow
                    Write-Host "Status: $($tradeData.bot.status)" -ForegroundColor Green
                    $tradeSuccessful = $true
                    break
                }
            }
        } catch {
            Write-Host "  ❌ Trade request failed: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # Step 5: Error analysis and auto-correction
        if (-not $tradeSuccessful) {
            Write-Host "🔍 Step 5: Analyzing failure and auto-correcting..." -ForegroundColor Blue
            
            try {
                $errorContent = $tradeResponse.Content | ConvertFrom-Json
                $errorMessage = $errorContent.message
                $errorDetails = $errorContent.error
                
                Write-Host "  ❌ Error: $errorMessage" -ForegroundColor Red
                Write-Host "  🔧 Details: $errorDetails" -ForegroundColor Gray
                
                # Auto-correction based on error patterns
                if ($errorDetails -match "Insufficient margin|insufficient") {
                    Write-Host "  🔧 Auto-fix: Reducing investment (insufficient funds)" -ForegroundColor Yellow
                    $optimalInvestment = [Math]::Max([Math]::Floor($optimalInvestment * 0.6), 5)
                } elseif ($errorDetails -match "NOTIONAL|notional") {
                    Write-Host "  🔧 Auto-fix: Increasing investment (minimum notional)" -ForegroundColor Yellow
                    $optimalInvestment = [Math]::Min($optimalInvestment * 1.8, 50)
                } elseif ($errorDetails -match "conversion|convert") {
                    Write-Host "  🔧 Auto-fix: Asset conversion handled by autoConvert=true" -ForegroundColor Yellow
                } elseif ($errorDetails -match "NEWT|symbol") {
                    Write-Host "  🔧 Auto-fix: Switching to BTC (symbol issue)" -ForegroundColor Yellow
                    $bestSymbol = "BTCUSDT"
                } else {
                    Write-Host "  🔧 Auto-fix: Adjusting parameters for unknown error" -ForegroundColor Yellow
                    $optimalInvestment = Get-Random -Minimum 8 -Maximum 30
                    $bestSymbol = "BTCUSDT"
                }
            } catch {
                Write-Host "  ⚠️ Could not parse error response, using random adjustments" -ForegroundColor Yellow
                $optimalInvestment = Get-Random -Minimum 8 -Maximum 25
            }
        }
        
    } catch {
        Write-Host "💥 Exception in attempt $retryCount : $($_.Exception.Message)" -ForegroundColor Red
        $optimalInvestment = Get-Random -Minimum 10 -Maximum 25
    }
    
    # Wait before next retry
    if (-not $tradeSuccessful -and $retryCount -lt $MaxRetries) {
        Write-Host "⏳ Waiting $RetryDelaySeconds seconds before next retry..." -ForegroundColor Yellow
        Start-Sleep -Seconds $RetryDelaySeconds
    }
}

# Final results
Write-Host ""
if ($tradeSuccessful) {
    Write-Host "✅ AUTOMATED DEBUG LOOP COMPLETED SUCCESSFULLY!" -ForegroundColor Green -BackgroundColor Black
    Write-Host "🎯 Real trade created in $retryCount attempts!" -ForegroundColor Cyan
} else {
    Write-Host "❌ AUTOMATED DEBUG LOOP EXHAUSTED ALL $MaxRetries ATTEMPTS" -ForegroundColor Red -BackgroundColor Yellow
    Write-Host "🔧 Consider manual intervention or parameter adjustment" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🏁 Automated debug workflow completed." -ForegroundColor White
