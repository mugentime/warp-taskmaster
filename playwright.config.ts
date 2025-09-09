import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Playwright Configuration for Binance Futures Arbitrage Bot
 * 
 * This configuration sets up automated browser testing for the trading interface,
 * including authentication, data extraction, and bot management automation.
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',
  
  // Global test timeout
  timeout: 60000, // 1 minute per test
  
  // Global expect timeout
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 1,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Global setup for authentication
  // globalSetup: './e2e/global-setup.ts',
  
  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { 
      outputFolder: 'e2e/reports/html',
      open: process.env.CI ? 'never' : 'on-failure'
    }],
    ['json', { 
      outputFile: 'e2e/reports/results.json' 
    }]
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL for the application
    baseURL: process.env.PW_BASE_URL || 'http://localhost:5173',
    
    // Browser context options
    headless: process.env.PLAYWRIGHT_HEADLESS === 'true',
    
    // Global test timeout
    actionTimeout: 15000, // 15 seconds for actions
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Run tests in headless mode by default, but allow override
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    
    // Use authenticated state (disabled for initial testing)
    // storageState: 'e2e/.auth/storageState.json',
    
    // Ignore HTTPS errors for local development
    ignoreHTTPSErrors: true,
    
    // Additional context options for trading applications
    viewport: { width: 1920, height: 1080 },
    
    // User agent
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ArbitrageBot/1.0',
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Additional Chromium-specific settings for trading
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-background-timer-throttling',
            '--disable-features=VizDisplayCompositor',
          ],
        },
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  
  // Folder for test artifacts such as screenshots, videos, traces, etc.
  outputDir: 'e2e/test-results/',
  
  // Note: webServer disabled since we run servers as background jobs
  // Use environment variable PW_BASE_URL to switch between dev and preview:
  // - Dev: http://localhost:5173 (default)
  // - Preview: http://localhost:4173
  
  // Global timeout for the entire test suite
  globalTimeout: process.env.CI ? 600000 : undefined, // 10 minutes on CI
});
