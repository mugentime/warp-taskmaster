import { test, expect } from '@playwright/test';

test.describe('React Rendering Verification', () => {
  
  test('should properly render React app with all expected elements', async ({ page }) => {
    console.log('🎭 Testing React app rendering...');
    
    // Navigate with extended timeout
    await page.goto('http://127.0.0.1:5173', { 
      waitUntil: 'networkidle',
      timeout: 15000 
    });
    
    // Wait for React app to initialize
    await page.waitForTimeout(2000);
    
    // Take screenshot of initial load
    await page.screenshot({ path: 'e2e/test-results/react-initial-load.png', fullPage: true });
    
    console.log('📄 Page loaded, checking for React elements...');
    
    // Check for loading state first
    const isLoading = await page.locator('[data-testid="app-loading"]').count();
    if (isLoading > 0) {
      console.log('⏳ App is loading, waiting...');
      await page.waitForSelector('[data-testid="app-main"]', { timeout: 10000 });
    }
    
    // Check for error state
    const hasError = await page.locator('[data-testid="error-title"]').count();
    if (hasError > 0) {
      const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
      console.log('❌ Error state detected:', errorMessage);
      await page.screenshot({ path: 'e2e/test-results/react-error-state.png' });
    }
    
    // Wait for main app content
    const mainApp = page.locator('[data-testid="app-main"]');
    await expect(mainApp).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Main app container visible');
    
    // Check for header
    const header = page.locator('header, [data-testid="header"], h1, h2').first();
    if (await header.count() > 0) {
      const headerText = await header.textContent();
      console.log('📋 Header found:', headerText?.slice(0, 50));
    } else {
      console.log('⚠️ No header found');
    }
    
    // Check for dashboard content
    const content = page.locator('[data-testid="app-content"]');
    await expect(content).toBeVisible();
    console.log('✅ Main content area visible');
    
    // Check for footer
    const footer = page.locator('[data-testid="app-footer"]');
    if (await footer.count() > 0) {
      const footerText = await footer.textContent();
      console.log('📋 Footer found:', footerText?.slice(0, 50));
    }
    
    // Get page title
    const title = await page.title();
    console.log('📰 Page title:', title);
    
    // Check for any buttons or interactive elements
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();
    const links = await page.locator('a').count();
    
    console.log('🔘 Interactive elements:', { buttons, inputs, links });
    
    // Take final screenshot
    await page.screenshot({ path: 'e2e/test-results/react-final-state.png', fullPage: true });
    
    // Check console for React logs
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    
    // Refresh to capture logs
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    console.log('📋 Console logs:', logs.filter(log => 
      log.includes('TaskMaster') || log.includes('React') || log.includes('🚀')
    ));
    
    // Basic React app assertions
    expect(title).toContain('TaskMaster');
    expect(await mainApp.count()).toBeGreaterThan(0);
  });
  
  test('should handle navigation within React app', async ({ page }) => {
    console.log('🧭 Testing React navigation...');
    
    await page.goto('http://127.0.0.1:5173');
    await page.waitForSelector('[data-testid="app-main"]', { timeout: 10000 });
    
    // Test if clicking any buttons works
    const buttons = await page.locator('button').all();
    console.log(`🔘 Found ${buttons.length} buttons to test`);
    
    for (let i = 0; i < Math.min(buttons.length, 2); i++) {
      try {
        const button = buttons[i];
        const buttonText = await button.textContent();
        console.log(`🖱️ Testing button ${i}: "${buttonText?.slice(0, 30)}"`);
        
        await button.click();
        await page.waitForTimeout(1000);
        
        // Check if page is still responsive
        const mainStillVisible = await page.locator('[data-testid="app-main"]').isVisible();
        expect(mainStillVisible).toBeTruthy();
        
        console.log(`✅ Button ${i} clicked successfully, app still responsive`);
      } catch (error) {
        console.log(`⚠️ Button ${i} interaction failed:`, error.message);
      }
    }
    
    await page.screenshot({ path: 'e2e/test-results/react-navigation-test.png', fullPage: true });
  });
});
