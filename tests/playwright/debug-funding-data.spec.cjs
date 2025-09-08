const { test, expect } = require('@playwright/test');

test('Debug funding data loading', async ({ page }) => {
    console.log('🔍 Debugging funding data loading...');
    
    // Monitor all network requests
    const networkRequests = [];
    const networkResponses = [];
    
    page.on('request', (request) => {
        networkRequests.push({
            url: request.url(),
            method: request.method(),
            timestamp: new Date().toISOString()
        });
        console.log(`📤 Request: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', async (response) => {
        const responseData = {
            url: response.url(),
            status: response.status(),
            statusText: response.statusText(),
            timestamp: new Date().toISOString()
        };
        
        // Capture response body for funding data
        if (response.url().includes('premiumIndex') || response.url().includes('funding')) {
            try {
                const body = await response.text();
                responseData.bodyPreview = body.substring(0, 500);
                console.log(`📥 Funding API Response: ${response.status()} - ${body.substring(0, 100)}...`);
            } catch (e) {
                console.log(`📥 Could not read response body: ${e.message}`);
            }
        } else {
            console.log(`📥 Response: ${response.status()} ${response.url()}`);
        }
        
        networkResponses.push(responseData);
    });
    
    // Monitor console for funding-related messages
    page.on('console', (msg) => {
        const text = msg.text();
        if (text.includes('funding') || text.includes('USDT') || text.includes('opportunity') || 
            text.includes('error') || text.includes('fail') || text.includes('fetch')) {
            console.log(`🔍 Console [${msg.type()}]: ${text}`);
        }
    });
    
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    
    // Wait longer for all data to load
    console.log('⏳ Waiting for data to load...');
    await page.waitForTimeout(10000);
    
    // Check for loading spinners
    const spinner = page.locator('.animate-spin, [data-testid="loading"]');
    if (await spinner.isVisible()) {
        console.log('🔄 Loading spinner is still visible');
        await page.waitForTimeout(5000);
    }
    
    // Look for the funding opportunities section
    const fundingSection = page.locator('div:has-text("Live Funding Rate Arbitrage Opportunities"), div:has-text("Funding")');
    console.log(`📊 Funding section visible: ${await fundingSection.isVisible()}`);
    
    if (await fundingSection.isVisible()) {
        console.log('✅ Funding section found');
        
        // Look for tables or data
        const tables = await page.locator('table').count();
        console.log(`📋 Found ${tables} tables`);
        
        const implementButtons = await page.locator('button:has-text("Implement")').count();
        console.log(`🎯 Found ${implementButtons} Implement buttons`);
        
        // Check table content
        if (tables > 0) {
            const tableContent = await page.locator('table').first().textContent();
            console.log(`📄 First table content: ${tableContent.substring(0, 300)}...`);
        }
        
    } else {
        console.log('❌ No funding section found');
        
        // Check what's actually on the page
        const pageContent = await page.textContent('body');
        console.log('📄 Full page content preview:');
        console.log(pageContent.substring(0, 1000));
        
        // Look for error messages
        const errorElements = page.locator('div:has-text("error"), div:has-text("fail"), div:has-text("Error")');
        const errorCount = await errorElements.count();
        console.log(`🚨 Found ${errorCount} potential error messages`);
        
        if (errorCount > 0) {
            for (let i = 0; i < errorCount; i++) {
                const errorText = await errorElements.nth(i).textContent();
                console.log(`🚨 Error ${i + 1}: ${errorText}`);
            }
        }
    }
    
    // Take screenshot for visual debugging
    await page.screenshot({ path: 'tests/debug-funding-data-page.png', fullPage: true });
    console.log('📸 Screenshot saved: tests/debug-funding-data-page.png');
    
    // Summary of network activity
    console.log('\n=================== NETWORK SUMMARY ===================');
    console.log(`📤 Total requests: ${networkRequests.length}`);
    console.log(`📥 Total responses: ${networkResponses.length}`);
    
    const fundingRequests = networkRequests.filter(req => 
        req.url.includes('premiumIndex') || req.url.includes('funding')
    );
    console.log(`🎯 Funding API requests: ${fundingRequests.length}`);
    
    fundingRequests.forEach((req, index) => {
        console.log(`${index + 1}. ${req.method} ${req.url}`);
    });
    
    const failedRequests = networkResponses.filter(resp => resp.status >= 400);
    if (failedRequests.length > 0) {
        console.log(`\n🚨 Failed requests (${failedRequests.length}):`);
        failedRequests.forEach((resp, index) => {
            console.log(`${index + 1}. ${resp.status} ${resp.url}`);
        });
    }
    console.log('=================== END SUMMARY ===================\n');
});

test('Force trigger funding data fetch', async ({ page }) => {
    console.log('🚀 Attempting to force trigger funding data fetch...');
    
    await page.goto('http://localhost:4173');
    await page.waitForTimeout(3000);
    
    // Try to execute the funding data fetch directly in browser console
    const result = await page.evaluate(async () => {
        try {
            // Try to access the funding service directly
            const response = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex');
            const data = await response.json();
            
            console.log('Direct API call result:', data.length, 'symbols');
            
            // Check if there's any filtering issue
            const usdtSymbols = data.filter(d => d.symbol.endsWith('USDT'));
            const nonZeroRates = usdtSymbols.filter(d => parseFloat(d.lastFundingRate) !== 0);
            
            return {
                total: data.length,
                usdtSymbols: usdtSymbols.length,
                nonZeroRates: nonZeroRates.length,
                samplePositive: nonZeroRates.filter(d => parseFloat(d.lastFundingRate) > 0).slice(0, 3),
                sampleNegative: nonZeroRates.filter(d => parseFloat(d.lastFundingRate) < 0).slice(0, 3)
            };
        } catch (error) {
            return { error: error.message };
        }
    });
    
    console.log('📊 Direct API call result:', JSON.stringify(result, null, 2));
    
    await page.waitForTimeout(2000);
});
