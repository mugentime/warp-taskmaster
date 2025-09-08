#!/usr/bin/env node
// ==========================================
// WARP TASKMASTER: Test Report Generator
// ==========================================
// Creates beautiful HTML reports with charts and visual proof

const fs = require('fs');
const path = require('path');

class TestReportGenerator {
    constructor(config = {}) {
        this.config = {
            reportPath: config.reportPath || 'tests/reports',
            outputFile: config.outputFile || 'test-dashboard.html',
            ...config
        };
    }
    
    findReportFiles() {
        const reportDir = this.config.reportPath;
        if (!fs.existsSync(reportDir)) {
            return [];
        }
        
        const files = fs.readdirSync(reportDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        return jsonFiles.map(file => {
            const filePath = path.join(reportDir, file);
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return { file, path: filePath, data: content };
        });
    }
    
    generateHTML(reports) {
        const backendReports = reports.filter(r => r.file.includes('backend-test'));
        const frontendReports = reports.filter(r => r.file.includes('frontend-test'));
        
        const latestBackend = backendReports[backendReports.length - 1];
        const latestFrontend = frontendReports[frontendReports.length - 1];
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WARP TaskMaster - Test Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .stat-card h3 {
            color: #4ecdc4;
            margin-bottom: 10px;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .success { color: #4CAF50; }
        .error { color: #f44336; }
        .warning { color: #ff9800; }
        
        .charts-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .chart-card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 20px;
            backdrop-filter: blur(10px);
        }
        
        .test-details {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 20px;
            backdrop-filter: blur(10px);
        }
        
        .test-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            margin: 5px 0;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
        }
        
        .test-name { font-weight: bold; }
        .test-duration { color: #ccc; font-size: 0.9em; }
        
        .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .status-pass {
            background: #4CAF50;
            color: white;
        }
        
        .status-fail {
            background: #f44336;
            color: white;
        }
        
        .timestamp {
            color: #ccc;
            font-size: 0.9em;
            text-align: center;
            margin-top: 20px;
        }
        
        .connection-proof {
            background: rgba(0, 255, 0, 0.1);
            border: 2px solid #4CAF50;
            border-radius: 10px;
            padding: 15px;
            margin: 10px 0;
        }
        
        .connection-proof h4 {
            color: #4CAF50;
            margin-bottom: 10px;
        }
        
        .asset-list {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
        }
        
        .asset-tag {
            background: rgba(255, 255, 255, 0.2);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8em;
        }
        
        @media (max-width: 768px) {
            .charts-container {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 WARP TaskMaster Test Dashboard</h1>
            <p>Comprehensive Connection Testing & Monitoring</p>
            <div class="timestamp">Last Updated: ${new Date().toLocaleString()}</div>
        </div>
        
        <div class="stats-grid">
            ${this.generateStatsCards(latestBackend, latestFrontend)}
        </div>
        
        <div class="charts-container">
            <div class="chart-card">
                <h3>Backend Test Results</h3>
                <canvas id="backendChart" width="400" height="300"></canvas>
            </div>
            <div class="chart-card">
                <h3>Frontend Test Results</h3>
                <canvas id="frontendChart" width="400" height="300"></canvas>
            </div>
        </div>
        
        ${this.generateConnectionProof(latestBackend, latestFrontend)}
        
        <div class="test-details">
            <h3>📋 Latest Test Results</h3>
            ${this.generateTestDetails(latestBackend, latestFrontend)}
        </div>
        
        <div class="test-details">
            <h3>📊 Test History</h3>
            <p>Backend Tests: ${backendReports.length} runs</p>
            <p>Frontend Tests: ${frontendReports.length} runs</p>
        </div>
    </div>
    
    <script>
        ${this.generateChartScript(latestBackend, latestFrontend)}
    </script>
</body>
</html>`;
    }
    
    generateStatsCards(backend, frontend) {
        const backendStats = backend ? backend.data.summary : { total: 0, passed: 0, failed: 0, duration: 0 };
        const frontendStats = frontend ? frontend.data.summary : { total: 0, passed: 0, failed: 0, duration: 0 };
        
        const totalTests = backendStats.total + frontendStats.total;
        const totalPassed = backendStats.passed + frontendStats.passed;
        const totalFailed = backendStats.failed + frontendStats.failed;
        const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
        
        return `
            <div class="stat-card">
                <h3>🎯 Overall Success Rate</h3>
                <div class="stat-value ${successRate >= 90 ? 'success' : successRate >= 70 ? 'warning' : 'error'}">${successRate}%</div>
                <div>${totalPassed}/${totalTests} tests passed</div>
            </div>
            
            <div class="stat-card">
                <h3>🖥️ Backend Status</h3>
                <div class="stat-value ${backendStats.failed === 0 ? 'success' : 'error'}">
                    ${backend ? (backendStats.failed === 0 ? '✅ HEALTHY' : '❌ ISSUES') : '⏸️ NO DATA'}
                </div>
                <div>${backendStats.passed}/${backendStats.total} tests passed</div>
            </div>
            
            <div class="stat-card">
                <h3>🌐 Frontend Status</h3>
                <div class="stat-value ${frontendStats.failed === 0 ? 'success' : 'error'}">
                    ${frontend ? (frontendStats.failed === 0 ? '✅ HEALTHY' : '❌ ISSUES') : '⏸️ NO DATA'}
                </div>
                <div>${frontendStats.passed}/${frontendStats.total} tests passed</div>
            </div>
            
            <div class="stat-card">
                <h3>⏱️ Response Time</h3>
                <div class="stat-value">${(backendStats.duration + frontendStats.duration).toFixed(2)}s</div>
                <div>Backend: ${backendStats.duration}s | Frontend: ${frontendStats.duration}s</div>
            </div>
        `;
    }
    
    generateConnectionProof(backend, frontend) {
        if (!backend || !backend.data.tests) return '';
        
        const connectionTest = backend.data.tests.find(t => t.name === 'Connection Test');
        if (!connectionTest || connectionTest.status !== 'PASS') return '';
        
        const validationData = connectionTest.validation;
        if (!validationData) return '';
        
        return `
            <div class="connection-proof">
                <h4>🔗 CONNECTION PROOF - LIVE DATA RETRIEVED</h4>
                <p><strong>✅ Successfully connected to Binance API</strong></p>
                <p><strong>Assets Found:</strong> ${connectionTest.response?.balance?.totalAssets || 'N/A'}</p>
                <p><strong>Connection Time:</strong> ${connectionTest.duration}ms</p>
                <p><strong>Verification:</strong> ${validationData.Message}</p>
                ${connectionTest.response?.balance?.detailedBalances ? `
                    <p><strong>Asset Types:</strong></p>
                    <div class="asset-list">
                        ${connectionTest.response.balance.detailedBalances.map(asset => `
                            <span class="asset-tag">${asset.asset}</span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    generateTestDetails(backend, frontend) {
        let html = '';
        
        if (backend && backend.data.tests) {
            html += '<h4>🖥️ Backend Tests</h4>';
            for (const test of backend.data.tests) {
                html += `
                    <div class="test-item">
                        <div>
                            <div class="test-name">${test.name}</div>
                            <div class="test-duration">${test.duration}ms</div>
                        </div>
                        <span class="status-badge status-${test.status.toLowerCase()}">
                            ${test.status}
                        </span>
                    </div>
                `;
            }
        }
        
        if (frontend && frontend.data.tests) {
            html += '<h4 style="margin-top: 20px;">🌐 Frontend Tests</h4>';
            for (const test of frontend.data.tests) {
                html += `
                    <div class="test-item">
                        <div>
                            <div class="test-name">${test.name}</div>
                            <div class="test-duration">${test.duration}ms</div>
                        </div>
                        <span class="status-badge status-${test.status.toLowerCase()}">
                            ${test.status}
                        </span>
                    </div>
                `;
            }
        }
        
        return html;
    }
    
    generateChartScript(backend, frontend) {
        const backendData = backend ? backend.data.summary : { passed: 0, failed: 0 };
        const frontendData = frontend ? frontend.data.summary : { passed: 0, failed: 0 };
        
        return `
            // Backend Chart
            const backendCtx = document.getElementById('backendChart').getContext('2d');
            new Chart(backendCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Passed', 'Failed'],
                    datasets: [{
                        data: [${backendData.passed}, ${backendData.failed}],
                        backgroundColor: ['#4CAF50', '#f44336'],
                        borderWidth: 2,
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: { color: 'white' }
                        }
                    }
                }
            });
            
            // Frontend Chart
            const frontendCtx = document.getElementById('frontendChart').getContext('2d');
            new Chart(frontendCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Passed', 'Failed'],
                    datasets: [{
                        data: [${frontendData.passed}, ${frontendData.failed}],
                        backgroundColor: ['#4CAF50', '#f44336'],
                        borderWidth: 2,
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: { color: 'white' }
                        }
                    }
                }
            });
        `;
    }
    
    generate() {
        const reports = this.findReportFiles();
        if (reports.length === 0) {
            console.log('⚠️  No test reports found. Run some tests first.');
            return;
        }
        
        const html = this.generateHTML(reports);
        const outputPath = path.join(this.config.reportPath, this.config.outputFile);
        
        fs.writeFileSync(outputPath, html);
        
        console.log(`✅ Test dashboard generated: ${outputPath}`);
        console.log(`📊 Reports processed: ${reports.length}`);
        console.log(`🌐 Open in browser: file://${path.resolve(outputPath)}`);
    }
}

// CLI execution
if (require.main === module) {
    const generator = new TestReportGenerator();
    generator.generate();
}

module.exports = TestReportGenerator;
