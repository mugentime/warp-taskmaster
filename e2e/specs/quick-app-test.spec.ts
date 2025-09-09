import { test, expect } from '@playwright/test';

test.describe('Quick App Functionality Test', () => {
  
  test('Test what works in the app ecosystem', async ({ page }) => {
    console.log('🚀 Quick app functionality test starting...');
    
    // Test 1: Backend API Direct Testing
    console.log('🔧 Testing Backend API...');
    
    const backendTests = await page.evaluate(async () => {
      const results = [];
      
      // Test health endpoint
      try {
        const response = await fetch('http://localhost:3001/api/v1/test');
        const data = await response.json();
        results.push({
          endpoint: '/api/v1/test',
          status: response.status,
          success: true,
          data: data
        });
      } catch (error) {
        results.push({
          endpoint: '/api/v1/test',
          success: false,
          error: error.message
        });
      }
      
      // Test account status
      try {
        const response = await fetch('http://localhost:3001/api/v1/account-status');
        const data = await response.json();
        results.push({
          endpoint: '/api/v1/account-status',
          status: response.status,
          success: true,
          data: data
        });
      } catch (error) {
        results.push({
          endpoint: '/api/v1/account-status',
          success: false,
          error: error.message
        });
      }
      
      return results;
    });
    
    console.log('🔧 Backend Test Results:');
    backendTests.forEach(result => {
      console.log(`  ${result.endpoint}: ${result.success ? '✅' : '❌'} ${result.status || 'ERROR'}`);
      if (result.success && result.data) {
        console.log(`    Response: ${JSON.stringify(result.data).slice(0, 100)}...`);
      }
    });
    
    // Test 2: Try Frontend Connection with Fallbacks
    console.log('🌐 Testing Frontend Connection...');
    
    let frontendWorking = false;
    let frontendError = '';
    
    try {
      await page.goto('http://localhost:4173', { timeout: 10000 });
      frontendWorking = true;
      console.log('✅ Frontend connected on port 4173');
    } catch (error) {
      frontendError = error.message;
      console.log('❌ Frontend port 4173 failed:', error.message);
      
      // Try port 5173 (dev server)
      try {
        await page.goto('http://localhost:5173', { timeout: 10000 });
        frontendWorking = true;
        console.log('✅ Frontend connected on port 5173');
      } catch (error2) {
        console.log('❌ Frontend port 5173 also failed:', error2.message);
      }
    }
    
    // Test 3: If frontend works, analyze it
    if (frontendWorking) {
      console.log('🔍 Analyzing Frontend...');
      
      // Take screenshot
      await page.screenshot({ path: 'e2e/test-results/frontend-working.png', fullPage: true });
      
      const frontendAnalysis = await page.evaluate(() => {
        return {
          title: document.title,
          bodyText: document.body?.innerText || '',
          bodyLength: document.body?.innerText?.length || 0,
          hasContent: document.body?.innerText?.length > 50,
          elementCounts: {
            all: document.querySelectorAll('*').length,
            inputs: document.querySelectorAll('input').length,
            buttons: document.querySelectorAll('button').length,
            divs: document.querySelectorAll('div').length
          },
          hasRoot: !!document.getElementById('root'),
          rootContent: document.getElementById('root')?.innerHTML?.length || 0
        };
      });
      
      console.log('🔍 Frontend Analysis:', JSON.stringify(frontendAnalysis, null, 2));
      
      // Try to interact if there are elements
      if (frontendAnalysis.elementCounts.inputs > 0) {
        console.log('📝 Testing input interactions...');
        try {
          const firstInput = await page.locator('input').first();
          await firstInput.fill('test-value');
          console.log('✅ Successfully filled first input');
          await page.screenshot({ path: 'e2e/test-results/input-filled.png' });
        } catch (error) {
          console.log('❌ Input interaction failed:', error.message);
        }
      }
      
      if (frontendAnalysis.elementCounts.buttons > 0) {
        console.log('🖱️ Testing button interactions...');
        try {
          const firstButton = await page.locator('button').first();
          const buttonText = await firstButton.textContent();
          console.log(`Clicking button: "${buttonText}"`);
          await firstButton.click();
          await page.waitForTimeout(2000);
          console.log('✅ Successfully clicked first button');
          await page.screenshot({ path: 'e2e/test-results/button-clicked.png' });
        } catch (error) {
          console.log('❌ Button interaction failed:', error.message);
        }
      }
    }
    
    // Test 4: Bot Creation Test (Backend Only)
    console.log('🤖 Testing Bot Creation API...');
    
    const botTest = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/v1/preflight-bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: 'BTCUSDT',
            strategyType: 'long',
            investment: 20,
            leverage: 2,
            apiKey: process.env.BINANCE_API_KEY || 'test',
            apiSecret: process.env.BINANCE_API_SECRET || 'test'
          })
        });
        
        const data = await response.json();
        return {
          success: true,
          status: response.status,
          data: data
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    console.log('🤖 Bot Test Result:', JSON.stringify(botTest, null, 2));
    
    // Test 5: Final System Assessment
    console.log('📊 Final System Assessment:');
    
    const systemStatus = {
      backend: backendTests.some(t => t.success) ? 'WORKING' : 'FAILED',
      frontend: frontendWorking ? 'WORKING' : 'FAILED',
      binanceAPI: botTest.success && botTest.status !== 400 ? 'WORKING' : 'NEEDS_CONFIG',
      overallHealth: 'PARTIAL'
    };
    
    // Determine overall health
    if (systemStatus.backend === 'WORKING' && systemStatus.frontend === 'WORKING') {
      systemStatus.overallHealth = 'GOOD';
    } else if (systemStatus.backend === 'WORKING') {
      systemStatus.overallHealth = 'BACKEND_ONLY';
    } else {
      systemStatus.overallHealth = 'ISSUES';
    }
    
    console.log('📊 SYSTEM STATUS:', JSON.stringify(systemStatus, null, 2));
    
    // Take final screenshot
    await page.screenshot({ path: 'e2e/test-results/final-system-test.png' });
    
    // At least backend should be working
    expect(systemStatus.backend).toBe('WORKING');
  });
});
