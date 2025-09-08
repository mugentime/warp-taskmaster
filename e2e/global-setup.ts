import { chromium, FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  
  // Check for required environment variables
  const binanceApiKey = process.env.BINANCE_API_KEY;
  const binanceApiSecret = process.env.BINANCE_API_SECRET;
  const appBaseUrl = process.env.APP_BASE_URL || baseURL;

  if (!binanceApiKey || !binanceApiSecret) {
    console.log('⚠️  BINANCE_API_KEY and BINANCE_API_SECRET not found in environment');
    console.log('ℹ️  Skipping authentication setup - tests will run without pre-authenticated state');
    return;
  }

  console.log('🚀 Setting up authenticated session...');
  console.log(`📍 Base URL: ${appBaseUrl}`);

  // Launch browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the application
    console.log('🌐 Navigating to application...');
    await page.goto(appBaseUrl || 'http://localhost:5173');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded successfully');

    // Check if API keys are already stored
    const apiKeysExist = await page.getByTestId('api-keys-exist').isVisible();
    
    if (apiKeysExist) {
      console.log('🔑 API keys already exist in browser storage');
      
      // Delete existing keys to refresh them
      console.log('🔄 Refreshing stored API keys...');
      await page.getByTestId('delete-keys-button').click();
      
      // Wait a moment for the deletion
      await page.waitForTimeout(1000);
    }

    // Wait for the API key form to appear
    console.log('📝 Filling API credentials...');
    await page.getByTestId('api-key-form').waitFor({ state: 'visible' });

    // Fill in API credentials from environment
    await page.getByTestId('api-key-input').fill(binanceApiKey);
    await page.getByTestId('api-secret-input').fill(binanceApiSecret);
    
    // Use a standard password for automation (can be changed in production)
    const automationPassword = 'automation123!';
    await page.getByTestId('password-input').fill(automationPassword);

    // Save the keys
    await page.getByTestId('save-keys-button').click();

    // Wait for success confirmation
    console.log('⏳ Waiting for authentication confirmation...');
    await page.getByTestId('api-key-success').waitFor({ 
      state: 'visible', 
      timeout: 10000 
    });

    console.log('✅ API keys saved successfully');

    // Wait a moment for the keys to be properly stored
    await page.waitForTimeout(2000);

    // Verify that the keys are now marked as existing
    const keysNowExist = await page.getByTestId('api-keys-exist').isVisible();
    if (keysNowExist) {
      console.log('🔐 Authentication state confirmed');
    } else {
      console.log('⚠️  Authentication state unclear');
    }

    // Save the authenticated state
    await context.storageState({ 
      path: 'e2e/.auth/storageState.json' 
    });

    console.log('💾 Authenticated session saved to storageState.json');

  } catch (error) {
    console.error('❌ Authentication setup failed:', error);
    console.log('ℹ️  Tests will run without pre-authenticated state');
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
