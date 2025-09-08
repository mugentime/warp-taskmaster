# NEWT Long Perp Bot Creation Script
# This script creates a LONG NEWTUSDT Perp bot with automated asset management

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,
    
    [Parameter(Mandatory=$true)]
    [string]$ApiSecret,
    
    [decimal]$Investment = 0.594,
    [int]$Leverage = 3,
    [bool]$DryRun = $true,
    [bool]$AutoConvert = $true
)

$BaseUrl = "http://localhost:3001"

# Bot configuration for NEWT Long Perp
$BotConfig = @{
    id = "newt-long-perp-$(Get-Date -Format 'yyyyMMddHHmmss')"
    name = "NEWT Long Perp Strategy"
    symbol = "NEWTUSDT"
    strategyType = "Long Perp"
    investment = $Investment
    leverage = $Leverage
    autoManaged = $true
    apiKey = $ApiKey
    apiSecret = $ApiSecret
    autoConvert = $AutoConvert
    dryRun = $DryRun
} | ConvertTo-Json -Depth 3

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " 🟢 CREATING NEWT LONG PERP BOT" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check server status
Write-Host "🔍 Checking backend server status..." -ForegroundColor Blue
try {
    $ServerTest = Invoke-RestMethod -Uri "$BaseUrl/api/v1/test" -Method GET
    if ($ServerTest.success) {
        Write-Host "✅ Backend server operational" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend server not responding" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Cannot connect to backend server: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Test account connection and get wallet balances
Write-Host ""
Write-Host "📊 Analyzing wallet balances..." -ForegroundColor Blue
try {
    $WalletRequest = @{
        apiKey = $ApiKey
        apiSecret = $ApiSecret
    } | ConvertTo-Json

    $WalletResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v1/get-all-wallet-balances" -Method POST -Body $WalletRequest -ContentType "application/json"
    
    if ($WalletResponse.success) {
        Write-Host "✅ Wallet analysis complete" -ForegroundColor Green
        Write-Host "   💰 Total Portfolio: $($WalletResponse.summary.totalUSDT) USDT" -ForegroundColor Cyan
        Write-Host "   📊 Wallets Analyzed: $($WalletResponse.summary.walletsAnalyzed)" -ForegroundColor Cyan
        
        # Show wallet distribution
        Write-Host "   🟢 Spot: $($WalletResponse.distribution.spot.assets) assets, $($WalletResponse.distribution.spot.usdt) USDT" -ForegroundColor Green
        Write-Host "   🔶 Futures: $($WalletResponse.distribution.futures.assets) assets, $($WalletResponse.distribution.futures.usdt) USDT" -ForegroundColor Yellow
        Write-Host "   🟡 Margin: $($WalletResponse.distribution.margin.assets) assets, $($WalletResponse.distribution.margin.usdt) USDT" -ForegroundColor DarkYellow
        Write-Host "   🔸 Isolated: $($WalletResponse.distribution.isolated.assets) assets, $($WalletResponse.distribution.isolated.usdt) USDT" -ForegroundColor Gray
        
        # Look for NEWT in the wallets
        if ($WalletResponse.wallets.total.balances.NEWT) {
            $NewtTotal = $WalletResponse.wallets.total.balances.NEWT.total
            Write-Host "   🟢 NEWT Found: $NewtTotal total across all wallets" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  NEWT not found in current balances" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Wallet analysis failed: $($WalletResponse.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Wallet analysis error: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Test transfer planning for NEWT Long Perp
Write-Host ""
Write-Host "🔄 Planning wallet transfers for NEWT Long Perp..." -ForegroundColor Blue
try {
    $TransferRequest = @{
        apiKey = $ApiKey
        apiSecret = $ApiSecret
        symbol = "NEWTUSDT"
        strategyType = "Long Perp"
        investment = $Investment
        autoExecute = $false
    } | ConvertTo-Json

    $TransferResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v1/plan-wallet-transfers" -Method POST -Body $TransferRequest -ContentType "application/json"
    
    if ($TransferResponse.success) {
        Write-Host "✅ Transfer planning complete" -ForegroundColor Green
        Write-Host "   📋 Transfers needed: $($TransferResponse.transferPlan.Count)" -ForegroundColor Cyan
        
        if ($TransferResponse.transferPlan.Count -gt 0) {
            Write-Host "   🔄 Planned Transfers:" -ForegroundColor Yellow
            foreach ($transfer in $TransferResponse.transferPlan) {
                Write-Host "      • $($transfer.amount) $($transfer.asset): $($transfer.fromWallet) → $($transfer.toWallet)" -ForegroundColor White
                Write-Host "        📝 $($transfer.reason)" -ForegroundColor Gray
            }
        } else {
            Write-Host "   ✅ No transfers needed - optimal distribution exists" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️  Transfer planning failed: $($TransferResponse.message)" -ForegroundColor Yellow
        Write-Host "   Proceeding with bot creation..." -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠️  Transfer planning error: $_" -ForegroundColor Yellow
    Write-Host "   Proceeding with bot creation..." -ForegroundColor Cyan
}

# Step 4: Create the NEWT Long Perp bot
Write-Host ""
Write-Host "🚀 Creating NEWT Long Perp bot..." -ForegroundColor Blue
Write-Host "⚠️  Bot Configuration:" -ForegroundColor Yellow
Write-Host "   Symbol: NEWTUSDT" -ForegroundColor White
Write-Host "   Strategy: Long Perp" -ForegroundColor White
Write-Host "   Investment: $Investment USDT" -ForegroundColor White
Write-Host "   Leverage: ${Leverage}x" -ForegroundColor White
Write-Host "   Dry Run: $DryRun" -ForegroundColor White
Write-Host "   Auto Convert: $AutoConvert" -ForegroundColor White

if (-not $DryRun) {
    Write-Host ""
    Write-Host "⚠️  WARNING: LIVE TRADING MODE!" -ForegroundColor Red
    Write-Host "⚠️  This will create an actual trading bot!" -ForegroundColor Red
    $Confirm = Read-Host "Type 'CONFIRM' to proceed"
    if ($Confirm -ne 'CONFIRM') {
        Write-Host "🛑 Bot creation cancelled" -ForegroundColor Yellow
        exit 0
    }
}

try {
    $BotResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v1/launch-bot" -Method POST -Body $BotConfig -ContentType "application/json"
    
    if ($BotResponse.success) {
        Write-Host ""
        Write-Host "🎉 NEWT Long Perp bot created successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🤖 Bot Details:" -ForegroundColor Cyan
        Write-Host "   ID: $($BotResponse.bot.id)" -ForegroundColor White
        Write-Host "   Name: $($BotResponse.bot.name)" -ForegroundColor White
        Write-Host "   Symbol: $($BotResponse.bot.symbol)" -ForegroundColor White
        Write-Host "   Strategy: $($BotResponse.bot.strategyType)" -ForegroundColor White
        Write-Host "   Investment: $($BotResponse.bot.investment) USDT" -ForegroundColor White
        Write-Host "   Leverage: $($BotResponse.bot.leverage)x" -ForegroundColor White
        Write-Host "   Status: $($BotResponse.bot.status)" -ForegroundColor White
        
        # Show automation summary
        if ($BotResponse.preflight.transfers) {
            Write-Host ""
            Write-Host "🔄 Automated Operations Completed:" -ForegroundColor Magenta
            Write-Host "   Wallet transfers: $($BotResponse.preflight.transfers.summary.totalTransfers)" -ForegroundColor White
            Write-Host "   Successful transfers: $($BotResponse.preflight.transfers.summary.successfulTransfers)" -ForegroundColor White
            if ($BotResponse.preflight.executed) {
                Write-Host "   Asset conversions: $($BotResponse.preflight.executed.Count)" -ForegroundColor White
            }
        }
        
        if ($DryRun) {
            Write-Host ""
            Write-Host "💡 This was a dry run - no actual trades executed" -ForegroundColor Yellow
            Write-Host "   Set -DryRun `$false to execute real trades" -ForegroundColor Cyan
        } else {
            Write-Host ""
            Write-Host "✅ Live bot is now active and trading!" -ForegroundColor Green
        }
        
    } else {
        Write-Host "❌ Bot creation failed: $($BotResponse.message)" -ForegroundColor Red
        if ($BotResponse.error) {
            Write-Host "   Error details: $($BotResponse.error)" -ForegroundColor Red
        }
        if ($BotResponse.requiresConversion) {
            Write-Host "   💡 Asset conversion required - enable AutoConvert" -ForegroundColor Yellow
        }
        exit 1
    }
} catch {
    Write-Host "❌ Bot creation error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " 🎉 NEWT LONG PERP BOT CREATION COMPLETED" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 System Features Used:" -ForegroundColor Cyan
Write-Host "  ✅ Multi-wallet NEWT detection" -ForegroundColor Green
Write-Host "  ✅ Automatic asset transfers" -ForegroundColor Green
Write-Host "  ✅ Long Perp + Spot sell execution" -ForegroundColor Green
Write-Host "  ✅ Automated position management" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Monitor your bot at:" -ForegroundColor Yellow
Write-Host "  • Web Interface: http://localhost:5173/" -ForegroundColor Cyan
Write-Host "  • API Backend: http://localhost:3001" -ForegroundColor Cyan
