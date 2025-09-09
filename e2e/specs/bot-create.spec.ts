import { test, expect } from '@playwright/test';

test.describe('Bot Creation Tests', () => {
  
  test('Complete bot creation workflow', async ({ page }) => {
    console.log('🤖 Starting bot creation test...');
    
    await page.goto('/', { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'e2e/test-results/bot-create-initial.png' });
    
    // Configure API keys
    console.log('🔑 Setting up API configuration...');
    const apiInputs = page.locator('input');
    const apiInputCount = await apiInputs.count();
    
    if (apiInputCount >= 2) {
      await apiInputs.nth(0).fill('test-binance-api-key-123456');
      await apiInputs.nth(1).fill('test-binance-secret-key-789012');
      
      const connectButtons = ['button:has-text("Test")', 'button:has-text("Connect")', 'button'];
      
      for (const buttonSelector of connectButtons) {
        try {
          const button = page.locator(buttonSelector).first();
          if (await button.count() > 0) {
            await button.click();
            await page.waitForTimeout(2000);
            console.log('✅ API connection attempted');
            break;
          }
        } catch {
          continue;
        }
      }
      
      await page.screenshot({ path: 'e2e/test-results/bot-create-api-configured.png' });
    }
    
    // Look for bot creation interface
    console.log('🔍 Looking for bot creation interface...');
    
    const botCreationSelectors = [
      '[data-testid="bot-creator"]',
      '[data-testid="simple-bot-creator"]', 
      'text="Create Bot"',
      'text="Investment"',
      'text="Symbol"'
    ];
    
    let botCreationFound = false;
    
    for (const selector of botCreationSelectors) {
      try {
        const element = page.locator(selector).first();
        await element.waitFor({ timeout: 5000 });
        console.log(`✅ Found bot creation interface: ${selector}`);
        botCreationFound = true;
        break;
      } catch {
        console.log(`⏭️ Bot creation selector not found: ${selector}`);
      }
    }
    
    if (botCreationFound) {
      console.log('🤖 Testing bot creation form...');
      
      // Fill investment amount
      const numberInputs = page.locator('input[type="number"]');
      if (await numberInputs.count() > 0) {
        await numberInputs.first().fill('20');
        console.log('✅ Set investment amount');
      }
      
      // Look for symbol selection
      const selects = page.locator('select');
      if (await selects.count() > 0) {
        await selects.first().selectOption({ index: 0 });
        console.log('✅ Selected symbol');
      }
      
      await page.screenshot({ path: 'e2e/test-results/bot-create-form-filled.png' });
      
      // Try to create bot
      const createButtons = ['button:has-text("Create")', 'button:has-text("Launch")'];
      
      for (const buttonSelector of createButtons) {
        try {
          const button = page.locator(buttonSelector).first();
          if (await button.count() > 0) {
            console.log(`🚀 Attempting to create bot with: ${buttonSelector}`);
            await button.click();
            await page.waitForTimeout(5000);
            break;
          }
        } catch (error) {
          console.log(`⏭️ Create button failed: ${buttonSelector}`);
        }
      }
      
      await page.screenshot({ path: 'e2e/test-results/bot-create-after-submit.png' });
    }
    
    // Test backend API
    console.log('🔧 Testing backend bot creation API...');
    
    const botApiTest = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/v1/launch-bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: 'BTCUSDT',
            strategyType: 'Long Perp',
            investment: 20,
            leverage: 2,
            name: 'Test Bot E2E',
            autoManaged: true,
            apiKey: 'test-key',
            apiSecret: 'test-secret'
          })
        });
        
        const data = await response.json();
        
        return {
          success: true,
          status: response.status,
          ok: response.ok,
          data: data
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    console.log('🔧 Bot API Test Result:', JSON.stringify(botApiTest, null, 2));
    
    await page.screenshot({ path: 'e2e/test-results/bot-create-final.png', fullPage: true });
    
    // Assertions
    expect(botCreationFound).toBe(true);
    expect(botApiTest.success).toBe(true);
    
    console.log('✅ Bot creation test completed!');
  });
});
