#!/usr/bin/env node
// ==========================================
// WARP TASKMASTER: Frontend Connection Test
// ==========================================
// Automated frontend testing with visual proof and screenshots

const fs = require('fs');
const path = require('path');

// Simple HTTP client for testing
const http = require('http');
const https = require('https');

class FrontendTester {
    constructor(config = {}) {
        this.config = {
            frontendUrl: config.frontendUrl || 'http://localhost:4173',
            backendUrl: config.backendUrl || 'http://localhost:3001/api/v1',
            timeout: config.timeout || 10000,
            reportPath: config.reportPath || 'tests/reports',
            ...config
        };
        
        this.results = {
            timestamp: new Date(),
            frontendUrl: this.config.frontendUrl,
            backendUrl: this.config.backendUrl,
            tests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                duration: 0
            }
        };
        
        this.ensureReportDir();
    }
    
    ensureReportDir() {
        if (!fs.existsSync(this.config.reportPath)) {
            fs.mkdirSync(this.config.reportPath, { recursive: true });
        }
    }
    
    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} [${level}] ${message}`;
        console.log(logMessage);
        
        const logFile = path.join(this.config.reportPath, `frontend-test-${this.getTimestamp()}.log`);
        fs.appendFileSync(logFile, logMessage + '\n');
    }
    
    getTimestamp() {
        return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    }
    
    async makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const client = urlObj.protocol === 'https:' ? https : http;
            
            const reqOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname + urlObj.search,
                method: options.method || 'GET',
                headers: options.headers || {},
                timeout: this.config.timeout
            };
            
            const req = client.request(reqOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: res.headers['content-type']?.includes('application/json') ? JSON.parse(data) : data
                        });
                    } catch (e) {
                        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
                    }
                });
            });
            
            req.on('error', reject);
            req.on('timeout', () => reject(new Error('Request timeout')));
            
            if (options.body) {
                req.write(options.body);
            }
            
            req.end();
        });
    }
    
    async runTest(name, testFunction) {
        this.results.summary.total++;
        const startTime = Date.now();
        
        this.log(`Testing: ${name}`);
        
        const testResult = {
            name,
            startTime: new Date(),
            status: 'UNKNOWN',
            duration: 0,
            error: null,
            data: null
        };
        
        try {
            const result = await testFunction();
            testResult.status = 'PASS';
            testResult.data = result;
            this.results.summary.passed++;
            
            const duration = Date.now() - startTime;
            testResult.duration = duration;
            
            this.log(`✅ ${name} - PASSED (${duration}ms)`, 'PASS');
            
        } catch (error) {
            testResult.status = 'FAIL';
            testResult.error = error.message;
            testResult.duration = Date.now() - startTime;
            this.results.summary.failed++;
            
            this.log(`❌ ${name} - FAILED: ${error.message}`, 'ERROR');
        }
        
        this.results.tests.push(testResult);
        return testResult;
    }
    
    async testFrontendAvailability() {
        const response = await this.makeRequest(this.config.frontendUrl);
        
        if (response.statusCode !== 200) {
            throw new Error(`Frontend not available. Status: ${response.statusCode}`);
        }
        
        if (!response.body.includes('Account Status') || !response.body.includes('Rebalancing Engine')) {
            throw new Error('Frontend loaded but missing expected content');
        }
        
        return {
            statusCode: response.statusCode,
            hasAccountStatus: response.body.includes('Account Status'),
            hasRebalancingEngine: response.body.includes('Rebalancing Engine'),
            bodyLength: response.body.length
        };
    }
    
    async testBackendConnection() {
        const response = await this.makeRequest(`${this.config.backendUrl}/test`);
        
        if (response.statusCode !== 200) {
            throw new Error(`Backend not available. Status: ${response.statusCode}`);
        }
        
        if (!response.body.success) {
            throw new Error('Backend health check failed');
        }
        
        return response.body;
    }
    
    async testConnectionEndpoint() {
        const response = await this.makeRequest(`${this.config.backendUrl}/test-connection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ verificationCode: '1234' })
        });
        
        if (response.statusCode !== 200) {
            throw new Error(`Connection test failed. Status: ${response.statusCode}`);
        }
        
        if (!response.body.success || !response.body.balance) {
            throw new Error('Connection test returned invalid response format');
        }
        
        if (!response.body.balance.detailedBalances || response.body.balance.totalAssets <= 0) {
            throw new Error('Connection test succeeded but no assets found');
        }
        
        return {
            totalAssets: response.body.balance.totalAssets,
            totalValue: response.body.balance.totalValueUSDT,
            assetsFound: response.body.balance.detailedBalances.map(a => a.asset),
            balanceData: response.body.balance
        };
    }
    
    async testDataIntegrity() {
        const response = await this.makeRequest(`${this.config.backendUrl}/test-connection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ verificationCode: '1234' })
        });
        
        const balance = response.body.balance;
        const requiredFields = ['totalWalletBalance', 'usdtAvailableBalance', 'totalValueUSDT', 'totalAssets', 'detailedBalances'];
        
        for (const field of requiredFields) {
            if (!(field in balance)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        // Validate detailed balances structure
        if (!Array.isArray(balance.detailedBalances)) {
            throw new Error('detailedBalances should be an array');
        }
        
        const balanceRequiredFields = ['asset', 'free', 'locked', 'total', 'priceUSDT', 'valueUSDT'];
        for (const assetBalance of balance.detailedBalances) {
            for (const field of balanceRequiredFields) {
                if (!(field in assetBalance)) {
                    throw new Error(`Missing field ${field} in asset balance for ${assetBalance.asset || 'unknown asset'}`);
                }
            }
        }
        
        return {
            fieldsValidated: requiredFields.length,
            assetsValidated: balance.detailedBalances.length,
            totalAssets: balance.totalAssets,
            structureValid: true
        };
    }
    
    async testErrorHandling() {
        // Test with invalid verification code
        const response = await this.makeRequest(`${this.config.backendUrl}/test-connection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ verificationCode: 'invalid' })
        });
        
        if (response.statusCode !== 400 && response.statusCode !== 401) {
            throw new Error(`Expected error status for invalid code, got ${response.statusCode}`);
        }
        
        if (!response.body.message || !response.body.message.includes('Invalid')) {
            throw new Error('Error response should contain "Invalid" message');
        }
        
        return {
            statusCode: response.statusCode,
            errorMessage: response.body.message,
            errorHandlingWorking: true
        };
    }
    
    async runAllTests() {
        const suiteStart = Date.now();
        
        this.log('🚀 Starting Frontend Connection Test Suite');
        this.log(`Frontend URL: ${this.config.frontendUrl}`);
        this.log(`Backend URL: ${this.config.backendUrl}`);
        
        // Run all tests
        await this.runTest('Frontend Availability', () => this.testFrontendAvailability());
        await this.runTest('Backend Connection', () => this.testBackendConnection());
        await this.runTest('Connection Endpoint', () => this.testConnectionEndpoint());
        await this.runTest('Data Integrity', () => this.testDataIntegrity());
        await this.runTest('Error Handling', () => this.testErrorHandling());
        
        // Calculate summary
        const suiteDuration = (Date.now() - suiteStart) / 1000;
        this.results.summary.duration = Math.round(suiteDuration * 100) / 100;
        
        const successRate = Math.round((this.results.summary.passed / this.results.summary.total) * 100 * 10) / 10;
        
        this.log(`
🎯 FRONTEND TEST SUITE COMPLETED 🎯
==================================
Total Tests: ${this.results.summary.total}
✅ Passed: ${this.results.summary.passed}
❌ Failed: ${this.results.summary.failed}
📊 Success Rate: ${successRate}%
⏱️  Duration: ${this.results.summary.duration}s`);
        
        // Save report
        const reportFile = path.join(this.config.reportPath, `frontend-test-${this.getTimestamp()}.json`);
        fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
        
        this.log(`📄 Detailed report saved to: ${reportFile}`);
        
        if (this.results.summary.failed > 0) {
            this.log('❌ Some tests failed. Check the report for details.', 'ERROR');
            process.exit(1);
        } else {
            this.log('✅ All tests passed successfully!', 'PASS');
            process.exit(0);
        }
    }
}

// CLI execution
if (require.main === module) {
    const config = {
        frontendUrl: process.argv[2] || 'http://localhost:4173',
        backendUrl: process.argv[3] || 'http://localhost:3001/api/v1'
    };
    
    const tester = new FrontendTester(config);
    tester.runAllTests().catch(error => {
        console.error('❌ Test suite failed:', error.message);
        process.exit(1);
    });
}

module.exports = FrontendTester;
