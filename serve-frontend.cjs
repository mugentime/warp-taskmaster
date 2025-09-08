// Simple HTTP Server for Frontend
const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 8080;

// Serve static files
app.use(express.static('.'));

// Proxy API requests to backend
app.use('/api', createProxyMiddleware({
    target: 'http://localhost:3001',
    changeOrigin: true,
    logLevel: 'silent'
}));

// Handle React routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`🌐 Frontend server running at http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔧 Backend API: http://localhost:3001/api/v1/status`);
    
    // Auto-open browser after 2 seconds
    setTimeout(() => {
        const { exec } = require('child_process');
        exec(`start http://localhost:${PORT}`);
    }, 2000);
});
