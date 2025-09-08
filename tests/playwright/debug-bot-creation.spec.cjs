const { test, expect } = require('@playwright/test');

test.describe('Bot Creation Debug', () => {
    let consoleMessages = [];
    let networkErrors = [];
    let jsErrors = [];

    test.beforeEach(async ({ page }) => {
        // Capture all console messages
        page.on('console', (msg) => {
            const message = {
                type: msg.type(),
                text: msg.text(),
                location: msg.location(),
                timestamp: new Date().toISOString()
            };
            consoleMessages.push(message);
            
            if (msg.type() === 'error') {
                console.log(`🔴 Console Error: ${msg.text()}`);
            } else if (msg.type() === 'warning') {
                console.log(`🟡 Console Warning: ${msg.text()}`);
            } else if (msg.text().includes('bot') || msg.text().includes('error') || msg.text().includes('fail')) {
                console.log(`🔍 Console Debug: [${msg.type()}] ${msg.text()}`);
            }
        });

        // Capture network failures
        page.on('requestfailed', (request) => {
            const error = {
                url: request.url(),
                method: request.method(),
                failure: request.failure()?.errorText,
                timestamp: new Date().toISOString()
            };
            networkErrors.push(error);
            console.log(`🌐 Network Error: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
        });

        // Capture JS errors
        page.on('pageerror', (error) => {
            jsErrors.push({
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            console.log(`🚨 JavaScript Error: ${error.message}`);
            console.log(`📍 Stack: ${error.stack}`);
        });

        // Clear arrays for fresh test
        consoleMessages = [];
        networkErrors = [];
        jsErrors = [];
    });

    test('Debug bot creation error with full logging', async ({ page }) => {
        console.log('🚀 Starting bot creation debug test...');
        
        // Go to the app with network monitoring
        await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
        
        // Wait for app to load and check for any immediate errors
        await page.waitForTimeout(2000);
        
        console.log(`📊 Page loaded. Found ${consoleMessages.length} console messages so far.`);
        
        // Look for the "Verify Connection" button first
        try {
            await page.waitForSelector('[data-testid="verify-connection"], button:has-text("Verify Connection")', { timeout: 5000 });
            console.log('✅ Found Verify Connection button');
            
            await page.click('[data-testid="verify-connection"], button:has-text("Verify Connection")');
            console.log('🔍 Clicked Verify Connection');
            
            // Wait for connection to complete
            await page.waitForTimeout(3000);
            
        } catch (error) {
            console.log('⚠️ Verify Connection button not found, continuing...');
        }

        // Look for funding opportunities table
        await page.waitForTimeout(2000);
        
        // Try to find any "Implement" buttons
        const implementButtons = await page.locator('button:has-text("Implement")').all();
        console.log(`🎯 Found ${implementButtons.length} Implement buttons`);
        
        if (implementButtons.length === 0) {
            console.log('❌ No Implement buttons found. Checking page content...');
            const pageContent = await page.textContent('body');
            console.log('📄 Page content preview:', pageContent.substring(0, 500));
            
            // Take screenshot for debugging
            await page.screenshot({ path: 'tests/debug-no-implement-buttons.png', fullPage: true });
            console.log('📸 Screenshot saved: tests/debug-no-implement-buttons.png');
            return;
        }

        // Click the first Implement button
        console.log('🔘 Clicking first Implement button...');
        await implementButtons[0].click();
        
        // Wait for modal to open
        await page.waitForTimeout(1000);
        
        // Check if modal opened
        const modal = page.locator('[role="dialog"], .modal, div:has-text("Create Arbitrage Bot")').first();
        
        try {
            await modal.waitFor({ timeout: 5000 });
            console.log('✅ Bot creation modal opened');
            
            // Fill in test data
            await page.fill('input[placeholder*="My ETH Short Bot"], input[id="botName"]', 'Debug Test Bot');
            console.log('📝 Filled bot name');
            
            await page.fill('input[placeholder*="1000"], input[id="investment"]', '10');
            console.log('📝 Filled investment amount');
            
            // Check the risk acknowledgment checkbox
            await page.check('input[type="checkbox"]:has(~ label:has-text("risk"))');
            console.log('☑️ Checked risk acknowledgment');
            
            // Take screenshot before clicking Launch
            await page.screenshot({ path: 'tests/debug-before-launch.png', fullPage: true });
            console.log('📸 Screenshot saved: tests/debug-before-launch.png');
            
            // Click Launch Bot button
            const launchButton = page.locator('button:has-text("Launch Bot")');
            await launchButton.waitFor({ timeout: 5000 });
            
            console.log('🚀 Clicking Launch Bot button...');
            await launchButton.click();
            
            // Wait for response and capture any errors
            await page.waitForTimeout(5000);
            
            // Take screenshot after clicking
            await page.screenshot({ path: 'tests/debug-after-launch.png', fullPage: true });
            console.log('📸 Screenshot saved: tests/debug-after-launch.png');
            
        } catch (error) {
            console.log(`❌ Modal interaction failed: ${error.message}`);
        }
        
        // Final wait to capture all console messages
        await page.waitForTimeout(2000);
        
        // Print all captured information
        console.log('\n=================== DEBUG SUMMARY ===================');
        console.log(`📊 Total Console Messages: ${consoleMessages.length}`);
        console.log(`🌐 Network Errors: ${networkErrors.length}`);
        console.log(`🚨 JavaScript Errors: ${jsErrors.length}`);
        
        if (jsErrors.length > 0) {
            console.log('\n🚨 JAVASCRIPT ERRORS:');
            jsErrors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.message}`);
                if (error.stack) {
                    console.log(`   Stack: ${error.stack.substring(0, 200)}...`);
                }
            });
        }
        
        if (networkErrors.length > 0) {
            console.log('\n🌐 NETWORK ERRORS:');
            networkErrors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.method} ${error.url} - ${error.failure}`);
            });
        }
        
        // Show relevant console messages
        const errorMessages = consoleMessages.filter(msg => 
            msg.type === 'error' || 
            msg.text.toLowerCase().includes('error') || 
            msg.text.toLowerCase().includes('fail') ||
            msg.text.toLowerCase().includes('bot')
        );
        
        if (errorMessages.length > 0) {
            console.log('\n🔍 RELEVANT CONSOLE MESSAGES:');
            errorMessages.forEach((msg, index) => {
                console.log(`${index + 1}. [${msg.type.toUpperCase()}] ${msg.text}`);
                if (msg.location && msg.location.url) {
                    console.log(`   Location: ${msg.location.url}:${msg.location.lineNumber}`);
                }
            });
        }
        
        console.log('=================== END SUMMARY ===================\n');
    });

    test('API Keys Password Modal Debug', async ({ page }) => {
        console.log('🔐 Testing API Keys and Password Modal...');
        
        await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        
        // Check if there's a settings or API key management section
        const settingsButton = page.locator('button:has-text("Settings"), [data-testid="settings"]').first();
        
        try {
            await settingsButton.waitFor({ timeout: 3000 });
            console.log('⚙️ Found Settings button, checking API key setup...');
            await settingsButton.click();
            await page.waitForTimeout(1000);
        } catch {
            console.log('⚠️ No Settings button found');
        }
        
        // Try to trigger the password modal by attempting a bot launch
        const implementButtons = await page.locator('button:has-text("Implement")').all();
        
        if (implementButtons.length > 0) {
            console.log('🔘 Attempting to trigger password modal...');
            await implementButtons[0].click();
            await page.waitForTimeout(1000);
            
            // Fill basic info and try to launch
            const modal = page.locator('[role="dialog"], .modal, div:has-text("Create Arbitrage Bot")').first();
            if (await modal.isVisible()) {
                await page.fill('input[id="botName"], input[placeholder*="Bot"]', 'Password Test Bot');
                await page.fill('input[id="investment"], input[placeholder*="1000"]', '10');
                await page.check('input[type="checkbox"]:has(~ label:has-text("risk"))');
                
                const launchButton = page.locator('button:has-text("Launch Bot")');
                if (await launchButton.isVisible()) {
                    console.log('🚀 Clicking Launch to trigger password modal...');
                    await launchButton.click();
                    await page.waitForTimeout(2000);
                    
                    // Check if password modal appeared
                    const passwordModal = page.locator('input[type="password"], div:has-text("password"), div:has-text("Password")').first();
                    if (await passwordModal.isVisible()) {
                        console.log('🔐 Password modal appeared');
                        await page.screenshot({ path: 'tests/debug-password-modal.png', fullPage: true });
                    } else {
                        console.log('⚠️ No password modal found');
                    }
                }
            }
        }
        
        await page.waitForTimeout(3000);
    });
});
