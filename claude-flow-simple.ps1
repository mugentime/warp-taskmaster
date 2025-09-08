# Claude-Flow Management Script
# Manages claude-flow workflows without requiring the problematic npm package

param(
    [string]$Action = "help",
    [string]$FlowName = "",
    [string]$Parameters = ""
)

# Configuration
$ConfigFile = "claude-flow.config.json"
$FlowsDir = "flows"
$LogsDir = "logs"

function Write-ClaudeFlowHeader {
    Write-Host "Claude-Flow TaskMaster v1.0.0" -ForegroundColor Cyan
    Write-Host "=" * 50 -ForegroundColor Gray
}

function Show-Help {
    Write-ClaudeFlowHeader
    Write-Host "Available Commands:" -ForegroundColor Yellow
    Write-Host "  init          Initialize claude-flow in current directory" -ForegroundColor Green
    Write-Host "  status        Show project status and configuration" -ForegroundColor Green
    Write-Host "  list          List available workflows" -ForegroundColor Green
    Write-Host "  run <flow>    Execute a specific workflow" -ForegroundColor Green
    Write-Host "  validate      Validate all workflow configurations" -ForegroundColor Green
    Write-Host "  logs          Show recent execution logs" -ForegroundColor Green
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\claude-flow-simple.ps1 init" -ForegroundColor Gray
    Write-Host "  .\claude-flow-simple.ps1 run bot-creation" -ForegroundColor Gray
    Write-Host "  .\claude-flow-simple.ps1 status" -ForegroundColor Gray
}

function Initialize-ClaudeFlow {
    Write-ClaudeFlowHeader
    Write-Host "Initializing Claude-Flow..." -ForegroundColor Yellow
    
    if (Test-Path $ConfigFile) {
        Write-Host "[OK] Configuration file already exists" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Configuration file not found" -ForegroundColor Red
        return
    }
    
    if (Test-Path $FlowsDir) {
        Write-Host "[OK] Flows directory exists" -ForegroundColor Green
    } else {
        New-Item -ItemType Directory -Path $FlowsDir | Out-Null
        Write-Host "[OK] Created flows directory" -ForegroundColor Green
    }
    
    if (Test-Path $LogsDir) {
        Write-Host "[OK] Logs directory exists" -ForegroundColor Green
    } else {
        New-Item -ItemType Directory -Path $LogsDir | Out-Null
        Write-Host "[OK] Created logs directory" -ForegroundColor Green
    }
    
    Write-Host "Claude-Flow initialization complete!" -ForegroundColor Green
}

function Show-Status {
    Write-ClaudeFlowHeader
    
    if (-not (Test-Path $ConfigFile)) {
        Write-Host "[ERROR] Claude-Flow not initialized. Run: .\claude-flow-simple.ps1 init" -ForegroundColor Red
        return
    }
    
    $config = Get-Content $ConfigFile | ConvertFrom-Json
    
    Write-Host "Project Status:" -ForegroundColor Yellow
    Write-Host "  Name: $($config.name)" -ForegroundColor White
    Write-Host "  Version: $($config.version)" -ForegroundColor White
    Write-Host "  Type: $($config.type)" -ForegroundColor White
    Write-Host "  Framework: $($config.framework)" -ForegroundColor White
    
    Write-Host "`nActive Agents:" -ForegroundColor Yellow
    foreach ($agent in $config.ai_agents.PSObject.Properties) {
        $status = if ($agent.Value.active) { "[Active]" } else { "[Inactive]" }
        Write-Host "  $($agent.Name): $status" -ForegroundColor White
    }
    
    Write-Host "`nIntegrations:" -ForegroundColor Yellow
    foreach ($integration in $config.integrations.PSObject.Properties) {
        Write-Host "  $($integration.Name): $($integration.Value.api_version)" -ForegroundColor White
    }
}

function List-Flows {
    Write-ClaudeFlowHeader
    Write-Host "Available Workflows:" -ForegroundColor Yellow
    
    if (Test-Path $FlowsDir) {
        $flows = Get-ChildItem -Path $FlowsDir -Filter "*.flow.json"
        if ($flows.Count -eq 0) {
            Write-Host "  No workflows found" -ForegroundColor Gray
        } else {
            foreach ($flow in $flows) {
                $flowConfig = Get-Content $flow.FullName | ConvertFrom-Json
                Write-Host "  * $($flowConfig.name)" -ForegroundColor Green
                Write-Host "     ID: $($flowConfig.id)" -ForegroundColor Gray
                Write-Host "     Description: $($flowConfig.description)" -ForegroundColor Gray
                Write-Host "     Steps: $($flowConfig.steps.Count)" -ForegroundColor Gray
                Write-Host ""
            }
        }
    } else {
        Write-Host "  Flows directory not found" -ForegroundColor Red
    }
}

function Run-Flow {
    param([string]$FlowId)
    
    Write-ClaudeFlowHeader
    Write-Host "Executing workflow: $FlowId" -ForegroundColor Yellow
    
    $flowFile = Join-Path $FlowsDir "$FlowId.flow.json"
    if (-not (Test-Path $flowFile)) {
        Write-Host "[ERROR] Workflow '$FlowId' not found" -ForegroundColor Red
        return
    }
    
    $flow = Get-Content $flowFile | ConvertFrom-Json
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logFile = Join-Path $LogsDir "$FlowId-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
    
    Write-Host "Starting workflow: $($flow.name)" -ForegroundColor Green
    
    foreach ($step in $flow.steps) {
        Write-Host "  Executing step: $($step.name)" -ForegroundColor Cyan
        
        # Log the step execution
        "[$timestamp] Starting step: $($step.name)" | Add-Content $logFile
        
        # Simulate step execution (in real implementation, this would call actual functions)
        Start-Sleep -Seconds 1
        
        Write-Host "  [OK] Completed step: $($step.name)" -ForegroundColor Green
        "[$timestamp] Completed step: $($step.name)" | Add-Content $logFile
    }
    
    Write-Host "Workflow completed successfully!" -ForegroundColor Green
    Write-Host "Log saved to: $logFile" -ForegroundColor Gray
}

function Validate-Flows {
    Write-ClaudeFlowHeader
    Write-Host "Validating workflow configurations..." -ForegroundColor Yellow
    
    $flows = Get-ChildItem -Path $FlowsDir -Filter "*.flow.json" -ErrorAction SilentlyContinue
    $validationErrors = 0
    
    foreach ($flowFile in $flows) {
        try {
            $flow = Get-Content $flowFile.FullName | ConvertFrom-Json
            $required = @('id', 'name', 'steps')
            
            $missing = $required | Where-Object { -not $flow.PSObject.Properties.Name.Contains($_) }
            
            if ($missing.Count -eq 0) {
                Write-Host "[OK] $($flowFile.BaseName): Valid" -ForegroundColor Green
            } else {
                Write-Host "[ERROR] $($flowFile.BaseName): Missing properties: $($missing -join ', ')" -ForegroundColor Red
                $validationErrors++
            }
        } catch {
            Write-Host "[ERROR] $($flowFile.BaseName): Invalid JSON format" -ForegroundColor Red
            $validationErrors++
        }
    }
    
    if ($validationErrors -eq 0) {
        Write-Host "`nAll workflows are valid!" -ForegroundColor Green
    } else {
        Write-Host "`nFound $validationErrors validation errors" -ForegroundColor Yellow
    }
}

function Show-Logs {
    Write-ClaudeFlowHeader
    Write-Host "Recent execution logs:" -ForegroundColor Yellow
    
    $logs = Get-ChildItem -Path $LogsDir -Filter "*.log" -ErrorAction SilentlyContinue | 
            Sort-Object LastWriteTime -Descending | 
            Select-Object -First 5
    
    if ($logs.Count -eq 0) {
        Write-Host "  No logs found" -ForegroundColor Gray
    } else {
        foreach ($log in $logs) {
            Write-Host "`n* $($log.Name)" -ForegroundColor Cyan
            Write-Host "   Last modified: $($log.LastWriteTime)" -ForegroundColor Gray
            $content = Get-Content $log.FullName -Tail 3
            foreach ($line in $content) {
                Write-Host "   $line" -ForegroundColor White
            }
        }
    }
}

# Main execution
switch ($Action.ToLower()) {
    "init" { Initialize-ClaudeFlow }
    "status" { Show-Status }
    "list" { List-Flows }
    "run" { 
        if ($FlowName) {
            Run-Flow $FlowName
        } else {
            Write-Host "[ERROR] Please specify a workflow name. Example: .\claude-flow-simple.ps1 run bot-creation" -ForegroundColor Red
        }
    }
    "validate" { Validate-Flows }
    "logs" { Show-Logs }
    default { Show-Help }
}
