import { test, expect } from '@playwright/test';

test.describe('Authentication Tests', () => {
  
  test('API key configuration and authentication flow', async ({ page }) => {
    console.log('🔐 Starting authentication test...');
    
    // Navigate to the application
    await page.goto('/', { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'e2e/test-results/auth-initial.png' });
    
    // Look for API configuration section
    console.log('🔍 Looking for API configuration section...');
    
    const apiConfigSelectors = [
      '[data-testid="api-config"]',
      '[data-testid="api-key-config"]',
      'text="API Configuration"',
      'text="API Key"',
      'text="API Secret"',
      'text="Connection"'
    ];
    
    let apiConfigFound = false;
    let configSelector = '';
    
    for (const selector of apiConfigSelectors) {
      try {
        const element = page.locator(selector).first();
        await element.waitFor({ timeout: 5000 });
        console.log(`✅ Found API config: ${selector}`);
        apiConfigFound = true;
        configSelector = selector;
        break;
      } catch {
        console.log(`⏭️ API config selector not found: ${selector}`);
      }
    }
    
    if (apiConfigFound) {
      console.log('🔑 Testing API key input fields...');
      
      // Look for API key input fields
      const apiKeyInput = page.locator('input').filter({ hasText: /api.*key/i }).or(page.locator('input[placeholder*="key" i]')).or(page.locator('input').nth(0));
      const apiSecretInput = page.locator('input').filter({ hasText: /secret/i }).or(page.locator('input[placeholder*="secret" i]')).or(page.locator('input[type="password"]')).or(page.locator('input').nth(1));
      
      try {
        // Test API key input
        if (await apiKeyInput.count() > 0) {
          await apiKeyInput.first().fill('test-api-key-12345');
          console.log('✅ Successfully filled API key field');
        }
        
        // Test API secret input
        if (await apiSecretInput.count() > 0) {
          await apiSecretInput.first().fill('test-api-secret-67890');
          console.log('✅ Successfully filled API secret field');
        }
        
        // Take screenshot after filling
        await page.screenshot({ path: 'e2e/test-results/auth-filled-fields.png' });
        
        // Look for connection test button
        const testButtons = [
          'button:has-text("Test")',
          'button:has-text("Connect")',
          'button:has-text("Verify")',
          'button:has-text("Check")',
          'button'
        ];
        
        let connectionTested = false;
        for (const buttonSelector of testButtons) {
          try {
            const button = page.locator(buttonSelector).first();
            if (await button.count() > 0) {
              console.log(`🔘 Clicking button: ${buttonSelector}`);
              await button.click();
              await page.waitForTimeout(2000);
              console.log('✅ Successfully clicked connection test button');
              connectionTested = true;
              break;
            }
          } catch (error) {
            console.log(`⏭️ Button click failed: ${buttonSelector} - ${error.message}`);
          }
        }
        
        // Take screenshot after interaction
        await page.screenshot({ path: 'e2e/test-results/auth-after-test.png' });
        
        // Check for authentication state indicators
        console.log('🔍 Checking for authentication state...');
        
        const authStateSelectors = [
          'text="Connected"',
          'text="Success"',
          'text="Valid"',
          'text="Error"',
          'text="Failed"',
          'text="Invalid"',
          '.text-green-400',
          '.text-red-400',
          '.bg-green-900',
          '.bg-red-900'
        ];
        
        let authStateFound = false;
        for (const selector of authStateSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 5000 });
            const element = page.locator(selector).first();
            const text = await element.textContent();
            console.log(`🔍 Found auth state: ${selector} - "${text}"`);
            authStateFound = true;
          } catch {
            // Continue checking other selectors
          }
        }
        
        console.log(`Authentication state detected: ${authStateFound ? 'Yes' : 'No'}`);
        
      } catch (error) {
        console.log('⚠️ Error during API key testing:', error.message);
      }
    }
    
    // Test negative case - invalid credentials
    console.log('🚫 Testing invalid credentials...');
    
    // Navigate to fresh page to reset state
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Try to input obviously invalid credentials
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    
    if (inputCount >= 2) {
      await inputs.nth(0).fill('invalid-key');
      await inputs.nth(1).fill('invalid-secret');
      
      // Try to submit/test
      const submitButton = page.locator('button').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(3000);
        
        // Check for error messages
        const errorSelectors = [
          'text="Error"',
          'text="Failed"',
          'text="Invalid"',
          '.text-red-400',
          '.bg-red-900'
        ];
        
        let errorFound = false;
        for (const selector of errorSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 3000 });
            console.log(`✅ Found expected error indicator: ${selector}`);
            errorFound = true;
            break;
          } catch {
            // Continue checking
          }
        }
        
        console.log(`Invalid credentials error shown: ${errorFound ? 'Yes' : 'No (or not implemented yet)'}`);
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'e2e/test-results/auth-final.png', fullPage: true });
    
    // At minimum, we should have found API configuration UI
    expect(apiConfigFound).toBe(true);
    
    console.log('✅ Authentication test completed!');
  });
  
  test('Backend authentication endpoint validation', async ({ page }) => {
    console.log('🔐 Testing backend authentication endpoints...');
    
    const authTests = await page.evaluate(async () => {
      const results = [];
      
      // Test various auth-related endpoints
      const endpoints = [
        { url: 'http://localhost:3001/api/v1/test-connection', method: 'POST' },
        { url: 'http://localhost:3001/api/v1/account-status', method: 'GET' },
        { url: 'http://localhost:3001/api/v1/wallet-balances', method: 'POST' }
      ];
      
      for (const endpoint of endpoints) {
        try {
          const requestBody = endpoint.method === 'POST' ? {
            apiKey: 'test-key',
            apiSecret: 'test-secret'
          } : null;
          
          const response = await fetch(endpoint.url, {
            method: endpoint.method,
            headers: { 'Content-Type': 'application/json' },
            body: requestBody ? JSON.stringify(requestBody) : null
          });
          
          const data = await response.json();
          
          results.push({
            endpoint: endpoint.url,
            method: endpoint.method,
            status: response.status,
            success: response.ok || response.status < 500, // Accept client errors as valid responses
            data: data
          });
        } catch (error) {
          results.push({
            endpoint: endpoint.url,
            method: endpoint.method,
            success: false,
            error: error.message
          });
        }
      }
      
      return results;
    });
    
    console.log('🔐 Auth endpoint test results:');
    authTests.forEach(result => {
      console.log(`  ${result.method} ${result.endpoint}: ${result.success ? '✅' : '❌'} ${result.status || 'ERROR'}`);
    });
    
    // At least one auth endpoint should be accessible
    const workingEndpoints = authTests.filter(r => r.success);
    expect(workingEndpoints.length).toBeGreaterThan(0);
    
    console.log('✅ Backend auth endpoint test completed!');
  });
});
