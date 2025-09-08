param(
    [Parameter(Mandatory=$true)]
    [string]$TaskName,
    
    [Parameter()]
    [string]$Status = "success"
)

$payload = @{
    task_name = $TaskName
    status = $Status
    message = "Task completed"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    source = "test-script"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/webhook/task-complete" -Method POST -Body $payload -ContentType "application/json" -TimeoutSec 5
    Write-Host "SUCCESS: Notification sent!" -ForegroundColor Green
    Write-Host "Task: $TaskName" -ForegroundColor Cyan
    Write-Host "Status: $Status" -ForegroundColor Yellow
} catch {
    Write-Host "ERROR: Failed to send notification" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    [console]::beep(800,200)
}
