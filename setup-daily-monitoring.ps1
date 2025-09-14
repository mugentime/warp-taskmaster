# TASKMASTER DAILY PERFORMANCE MONITORING SETUP
# This script sets up automated daily monitoring of TaskMaster performance vs expectations

Write-Host "🤖 TASKMASTER DAILY MONITORING SETUP" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Get current directory
$TaskMasterPath = Get-Location
$MonitorScript = Join-Path $TaskMasterPath "backend\daily-performance-monitor.js"

Write-Host "📍 TaskMaster Path: $TaskMasterPath" -ForegroundColor Green
Write-Host "📊 Monitor Script: $MonitorScript" -ForegroundColor Green
Write-Host ""

# Check if monitor script exists
if (-not (Test-Path $MonitorScript)) {
    Write-Host "❌ Monitor script not found: $MonitorScript" -ForegroundColor Red
    Write-Host "Please ensure daily-performance-monitor.cjs exists" -ForegroundColor Red
    exit 1
}

# Test the monitor script first
Write-Host "🧪 Testing monitor script..." -ForegroundColor Yellow
try {
    $testResult = node $MonitorScript
    Write-Host "✅ Monitor script test successful" -ForegroundColor Green
}
catch {
    Write-Host "❌ Monitor script test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please fix the script before scheduling" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "⏰ SCHEDULING OPTIONS:" -ForegroundColor Cyan
Write-Host "1. Windows Task Scheduler (Recommended)" -ForegroundColor White
Write-Host "2. PowerShell Scheduled Job" -ForegroundColor White
Write-Host "3. Manual setup instructions" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Choose scheduling method (1-3)"

switch ($choice) {
    "1" {
        Write-Host "📅 Setting up Windows Task Scheduler..." -ForegroundColor Yellow
        
        # Create Task Scheduler task
        $taskName = "TaskMaster-Daily-Performance-Monitor"
        $taskDescription = "Daily performance monitoring for TaskMaster arbitrage system"
        $taskCommand = "node"
        $taskArguments = "`"$MonitorScript`""
        
        # Check if task already exists
        $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        if ($existingTask) {
            Write-Host "⚠️ Task already exists. Removing old version..." -ForegroundColor Yellow
            Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        }
        
        # Create the scheduled task
        $action = New-ScheduledTaskAction -Execute $taskCommand -Argument $taskArguments -WorkingDirectory $TaskMasterPath
        
        # Set trigger for daily execution at 9:00 AM
        $trigger = New-ScheduledTaskTrigger -Daily -At "09:00"
        
        # Set task settings
        $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
        
        # Register the task
        try {
            Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description $taskDescription
            Write-Host "✅ Scheduled task created successfully!" -ForegroundColor Green
            Write-Host "📅 Task will run daily at 9:00 AM" -ForegroundColor Green
            Write-Host "🔧 Task name: $taskName" -ForegroundColor Green
            
            # Test run the task
            Write-Host ""
            Write-Host "🧪 Testing scheduled task..." -ForegroundColor Yellow
            Start-ScheduledTask -TaskName $taskName
            Start-Sleep -Seconds 5
            
            $taskInfo = Get-ScheduledTask -TaskName $taskName
            Write-Host "📊 Task Status: $($taskInfo.State)" -ForegroundColor Green
            
        } catch {
            Write-Host "❌ Failed to create scheduled task: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "Try running PowerShell as Administrator" -ForegroundColor Yellow
        }
    }
    
    "2" {
        Write-Host "📅 Setting up PowerShell Scheduled Job..." -ForegroundColor Yellow
        
        $jobName = "TaskMasterMonitoring"
        
        # Remove existing job if it exists
        $existingJob = Get-ScheduledJob -Name $jobName -ErrorAction SilentlyContinue
        if ($existingJob) {
            Write-Host "⚠️ Job already exists. Removing old version..." -ForegroundColor Yellow
            Unregister-ScheduledJob -Name $jobName -Force
        }
        
        # Create daily trigger at 9:00 AM
        $trigger = New-JobTrigger -Daily -At "09:00"
        
        # Create the scheduled job
        try {
            $scriptBlock = [ScriptBlock]::Create("Set-Location '$TaskMasterPath'; node '$MonitorScript'")
            Register-ScheduledJob -Name $jobName -ScriptBlock $scriptBlock -Trigger $trigger
            
            Write-Host "✅ PowerShell scheduled job created successfully!" -ForegroundColor Green
            Write-Host "📅 Job will run daily at 9:00 AM" -ForegroundColor Green
            Write-Host "🔧 Job name: $jobName" -ForegroundColor Green
            
            # Show job details
            Get-ScheduledJob -Name $jobName | Format-Table
            
        } catch {
            Write-Host "❌ Failed to create scheduled job: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    "3" {
        Write-Host "📋 MANUAL SETUP INSTRUCTIONS:" -ForegroundColor Cyan
        Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. WINDOWS TASK SCHEDULER:" -ForegroundColor Yellow
        Write-Host "   - Open Task Scheduler (taskschd.msc)" -ForegroundColor White
        Write-Host "   - Create Basic Task" -ForegroundColor White
        Write-Host "   - Name: TaskMaster Daily Monitor" -ForegroundColor White
        Write-Host "   - Trigger: Daily at 9:00 AM" -ForegroundColor White
        Write-Host "   - Action: Start a program" -ForegroundColor White
        Write-Host "   - Program: node" -ForegroundColor White
        Write-Host "   - Arguments: `"$MonitorScript`"" -ForegroundColor White
        Write-Host "   - Start in: $TaskMasterPath" -ForegroundColor White
        Write-Host ""
        Write-Host "2. CRON (if using WSL/Linux):" -ForegroundColor Yellow
        Write-Host "   - Run: crontab -e" -ForegroundColor White
        Write-Host "   - Add: 0 9 * * * cd $TaskMasterPath && node backend/daily-performance-monitor.js" -ForegroundColor White
        Write-Host ""
        Write-Host "3. MANUAL EXECUTION:" -ForegroundColor Yellow
        Write-Host "   - Run daily: node backend/daily-performance-monitor.js" -ForegroundColor White
        Write-Host "   - Or use: ."`\setup-daily-monitoring.ps1" and choose option 1 or 2" -ForegroundColor White
    }
    
    default {
        Write-Host "❌ Invalid choice. Please run the script again and choose 1, 2, or 3." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📊 MONITORING FEATURES:" -ForegroundColor Cyan
Write-Host "• Compares actual vs expected performance" -ForegroundColor White
Write-Host "• Tracks portfolio growth over time" -ForegroundColor White
Write-Host "• Calculates performance ratios" -ForegroundColor White
Write-Host "• Provides actionable recommendations" -ForegroundColor White
Write-Host "• Sends Telegram alerts (if configured)" -ForegroundColor White
Write-Host "• Saves historical data for analysis" -ForegroundColor White
Write-Host ""

Write-Host "📈 EXPECTED BASELINE:" -ForegroundColor Cyan
Write-Host "• Portfolio Value: $388.35" -ForegroundColor White
Write-Host "• Daily ROI: 1.53%" -ForegroundColor White
Write-Host "• Daily Earnings: $5.95" -ForegroundColor White
Write-Host "• Active Positions: 7" -ForegroundColor White
Write-Host "• Capital Utilization: 162.2%" -ForegroundColor White
Write-Host ""

Write-Host "🎯 TO RUN MANUALLY:" -ForegroundColor Cyan
Write-Host "node backend/daily-performance-monitor.js" -ForegroundColor Green
Write-Host ""

Write-Host "📱 TO ENABLE TELEGRAM NOTIFICATIONS:" -ForegroundColor Cyan
Write-Host "Add to .env file:" -ForegroundColor White
Write-Host "TELEGRAM_BOT_TOKEN=your_bot_token" -ForegroundColor Yellow
Write-Host "TELEGRAM_CHAT_ID=your_chat_id" -ForegroundColor Yellow
Write-Host ""

Write-Host "✅ Daily monitoring setup completed!" -ForegroundColor Green
Write-Host "📊 Your TaskMaster system will now be monitored daily for performance vs expectations." -ForegroundColor Green
Write-Host ""

# Show next steps
Write-Host "🔧 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Wait for tomorrow's first report" -ForegroundColor White
Write-Host "2. Review performance data in ./performance-data/" -ForegroundColor White
Write-Host "3. Configure Telegram for automated alerts" -ForegroundColor White
Write-Host "4. Adjust system if performance deviates from expectations" -ForegroundColor White
Write-Host ""

Write-Host "🎉 TaskMaster Daily Monitoring is now active!" -ForegroundColor Green
