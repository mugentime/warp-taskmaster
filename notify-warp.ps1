param(
    [Parameter(Mandatory=$true)]
    [string]$TaskName,
    
    [Parameter()]
    [ValidateSet("success", "error", "warning", "info")]
    [string]$Status = "success",
    
    [Parameter()]
    [string]$Message = "Task completed",
    
    [Parameter()]
    [string]$Duration = $null,
    
    [Parameter()]
    [string]$WebhookUrl = "http://localhost:3001/webhook/task-complete"
)

# Create notification payload
$payload = @{
    task_name = $TaskName
    status = $Status
    message = $Message
    duration = $Duration
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    source = "warp-powershell"
} | ConvertTo-Json

# Send webhook notification
try {
    $response = Invoke-RestMethod -Uri $WebhookUrl -Method POST -Body $payload -ContentType "application/json" -TimeoutSec 5
    
    Write-Host "✅ Notification sent successfully!" -ForegroundColor Green
    Write-Host "📋 Task: $TaskName" -ForegroundColor Cyan
    Write-Host "🔔 Status: $Status" -ForegroundColor Yellow
    Write-Host "💬 Message: $Message" -ForegroundColor White
    
    if ($Duration) {
        Write-Host "⏱️  Duration: $Duration" -ForegroundColor Gray
    }
    
} catch {
    Write-Warning "❌ Failed to send notification: $($_.Exception.Message)"
    Write-Host "🔇 Falling back to system beep..." -ForegroundColor Yellow
    
    # Fallback to system beep if webhook fails
    switch ($Status) {
        "success" { [console]::beep(800, 200) }
        "error" { [console]::beep(400, 500) }
        "warning" { [console]::beep(600, 300) }
        "info" { [console]::beep(1000, 150) }
    }
}

# Usage examples as comments:
<#
# Basic usage
.\notify-warp.ps1 -TaskName "Build Complete"

# With custom status and message  
.\notify-warp.ps1 -TaskName "Deploy" -Status "error" -Message "Deployment failed"

# With duration
.\notify-warp.ps1 -TaskName "Tests" -Status "success" -Message "All tests passed" -Duration "2m 15s"

# Different notification types
.\notify-warp.ps1 -TaskName "Compilation" -Status "warning" -Message "Build completed with warnings"
.\notify-warp.ps1 -TaskName "Backup" -Status "info" -Message "Backup process started"
#>
