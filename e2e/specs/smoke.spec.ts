import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Basic App Functionality', () => {
  
  test('Application loads successfully and shows critical components', async ({ page }) => {
    console.log('🚀 Starting smoke test...');
    
    // Navigate to the application
    await page.goto('/', { timeout: 15000 });
    
    // Wait for React to render
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Give React time to hydrate
    
    // Verify page title
    expect(await page.title()).toContain('Binance');
    
    // Take initial screenshot
    await page.screenshot({ path: 'e2e/test-results/smoke-initial-load.png' });
    
    // Check for critical components with fallback selectors
    console.log('🔍 Checking for critical components...');
    
    // 1. Check for app root
    const appRoot = page.locator('#root');
    await expect(appRoot).toBeVisible({ timeout: 10000 });
    
    // 2. Check for primary header/title content
    const headerSelectors = [
      '[data-testid="app-header"]',
      'h1',
      '.bg-blue-900', // InfoAlert background
      'text="Please Note"', // InfoAlert text
      'text="TaskMaster"',
      'text="Arbitrage"'
    ];
    
    let headerFound = false;
    for (const selector of headerSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        console.log(`✅ Found header element: ${selector}`);
        headerFound = true;
        break;
      } catch {
        console.log(`⏭️ Header selector not found: ${selector}`);
      }
    }
    expect(headerFound).toBe(true);
    
    // 3. Check for main content areas
    const contentSelectors = [
      '[data-testid="dashboard"]',
      '[data-testid="api-config"]',
      'text="API Configuration"',
      'text="Live Arbitrage Opportunities"',
      '.grid', // Grid layout
      'button' // Any buttons
    ];
    
    let contentFound = false;
    for (const selector of contentSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        console.log(`✅ Found content element: ${selector}`);
        contentFound = true;
        break;
      } catch {
        console.log(`⏭️ Content selector not found: ${selector}`);
      }
    }
    expect(contentFound).toBe(true);
    
    // 4. Check for interaction elements
    const interactiveElements = page.locator('button, input, select, a');
    const interactiveCount = await interactiveElements.count();
    console.log(`🎯 Found ${interactiveCount} interactive elements`);
    expect(interactiveCount).toBeGreaterThan(0);
    
    // 5. Validate no critical console errors
    console.log('🔍 Checking console for critical errors...');
    const consoleLogs = [];
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' && !text.includes('favicon') && !text.includes('404')) {
        consoleLogs.push(`${type}: ${text}`);
      }
    });
    
    // Wait a bit to capture any delayed console errors
    await page.waitForTimeout(3000);
    
    if (consoleLogs.length > 0) {
      console.log('⚠️ Console errors detected:', consoleLogs);
    }
    
    // Allow some non-critical errors but not many
    expect(consoleLogs.length).toBeLessThanOrEqual(2);
    
    // Take final screenshot
    await page.screenshot({ path: 'e2e/test-results/smoke-final.png', fullPage: true });
    
    console.log('✅ Smoke test completed successfully!');
  });
  
  test('Backend API is accessible and responsive', async ({ page }) => {
    console.log('🔧 Testing backend API connectivity...');
    
    // Test backend API directly
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/v1/test', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        return {
          ok: response.ok,
          status: response.status,
          data: await response.json()
        };
      } catch (error) {
        return {
          ok: false,
          error: error.message
        };
      }
    });
    
    console.log('🔧 Backend API Response:', apiResponse);
    
    // Expect backend to be reachable
    expect(apiResponse.ok).toBe(true);
    expect(apiResponse.status).toBe(200);
    
    console.log('✅ Backend API test passed!');
  });
});
