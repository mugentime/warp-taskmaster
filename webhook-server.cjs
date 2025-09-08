const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.WEBHOOK_PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Function to play sound on Windows
function playSound(soundType = 'success') {
    const soundFiles = {
        success: 'C:\\Windows\\Media\\chimes.wav',
        error: 'C:\\Windows\\Media\\chord.wav',
        warning: 'C:\\Windows\\Media\\ding.wav',
        info: 'C:\\Windows\\Media\\notify.wav'
    };
    
    const soundPath = soundFiles[soundType] || soundFiles.success;
    const playCommand = `powershell -c "(New-Object Media.SoundPlayer '${soundPath}').PlaySync()"`;
    
    exec(playCommand, (error) => {
        if (error) {
            console.error('🔇 Error playing sound:', error.message);
            exec('powershell -c "[console]::beep(800,200)"');
        } else {
            console.log(`🔊 Played ${soundType} notification`);
        }
    });
}

// Webhook endpoints
app.post('/webhook/task-complete', (req, res) => {
    const { 
        task_name, 
        status = 'success', 
        message, 
        duration,
        timestamp = new Date().toISOString(),
        source = 'warp'
    } = req.body;

    console.log('\n🚨 WARP TASK NOTIFICATION 🚨');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📋 Task: ${task_name || 'Unknown Task'}`);
    console.log(`✅ Status: ${status.toUpperCase()}`);
    console.log(`⏱️  Duration: ${duration || 'N/A'}`);
    console.log(`💬 Message: ${message || 'Task completed'}`);
    console.log(`🕒 Time: ${new Date(timestamp).toLocaleString()}`);
    console.log(`🔧 Source: ${source}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Play appropriate sound
    playSound(status);

    res.json({ 
        success: true, 
        message: 'Notification received and processed',
        sound_played: status,
        timestamp: new Date().toISOString()
    });
});

// Generic notification endpoint
app.post('/webhook/notify', (req, res) => {
    const { 
        title = 'Notification',
        message = 'Task completed',
        type = 'info'
    } = req.body;

    console.log(`🔔 ${title}: ${message}`);
    playSound(type);

    res.json({ success: true, notification: 'sent' });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'warp-webhook-notifier',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Test endpoint - fixed route
app.get('/test', (req, res) => {
    const soundType = req.query.sound || 'success';
    console.log(`🎵 Testing ${soundType} sound...`);
    playSound(soundType);
    res.json({ 
        message: `Testing ${soundType} sound notification`,
        available_sounds: ['success', 'error', 'warning', 'info']
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Warp Webhook Notifier',
        version: '1.0.0',
        endpoints: {
            'POST /webhook/task-complete': 'Warp task completion notifications',
            'POST /webhook/notify': 'Generic notifications',
            'GET /health': 'Health check',
            'GET /test?sound=type': 'Test sound notifications',
            'GET /': 'This help page'
        },
        sound_types: ['success', 'error', 'warning', 'info'],
        port: PORT
    });
});

// Start server
app.listen(PORT, () => {
    console.log('\n🚀 Warp Webhook Notifier Started!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook/task-complete`);
    console.log(`🔧 Generic notify: http://localhost:${PORT}/webhook/notify`);
    console.log(`🧪 Test sounds: http://localhost:${PORT}/test?sound=success`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Test sound on startup
    setTimeout(() => {
        console.log('🎵 Testing notification system...');
        playSound('success');
    }, 1000);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Warp Webhook Notifier...');
    playSound('info');
    setTimeout(() => process.exit(0), 500);
});
