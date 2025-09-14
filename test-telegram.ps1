# Test script for Telegram notifications
param(
    [switch]$UseEnvFile
)

Write-Host "[INFO] Testing Telegram configuration..." -ForegroundColor Cyan

# Try to get tokens from environment or .env file
$TelegramToken = $env:TELEGRAM_BOT_TOKEN
$ChatId = $env:TELEGRAM_CHAT_ID

if ($UseEnvFile -and (-not $TelegramToken -or -not $ChatId)) {
    Write-Host "[INFO] Checking backend/.env for tokens..." -ForegroundColor Gray
    if (Test-Path "backend\.env") {
        $envContent = Get-Content "backend\.env"
        foreach ($line in $envContent) {
            if ($line -match "TELEGRAM_BOT_TOKEN=(.+)") {
                $TelegramToken = $matches[1]
                Write-Host "[INFO] Found bot token in .env" -ForegroundColor Green
            }
            elseif ($line -match "TELEGRAM_CHAT_ID=(.+)") {
                $ChatId = $matches[1]
                Write-Host "[INFO] Found chat ID in .env" -ForegroundColor Green
            }
        }
    }
}

if (-not $TelegramToken -or -not $ChatId) {
    Write-Host "[ERROR] Missing Telegram credentials!" -ForegroundColor Red
    Write-Host "Make sure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set in environment or use -UseEnvFile" -ForegroundColor Yellow
    exit 1
}

# Test message
$testMessage = "[TEST] TaskMaster Supervision Test Message`n`nSent at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

Write-Host "`n[INFO] Sending test message to Telegram..." -ForegroundColor Cyan
Write-Host "Bot Token: $($TelegramToken.Substring(0,8))..." -ForegroundColor Gray
Write-Host "Chat ID: $ChatId" -ForegroundColor Gray

try {
    $url = "https://api.telegram.org/bot$TelegramToken/sendMessage"
    $body = @{
        chat_id = $ChatId
        text = $testMessage
        parse_mode = "Markdown"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
    
    if ($response.ok) {
        Write-Host "`n[SUCCESS] Test message sent successfully!" -ForegroundColor Green
        Write-Host "Message ID: $($response.result.message_id)" -ForegroundColor Gray
    } else {
        Write-Host "`n[ERROR] Failed to send message: $($response.description)" -ForegroundColor Red
    }
} catch {
    Write-Host "`n[ERROR] Request failed: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody" -ForegroundColor Red
    }
}