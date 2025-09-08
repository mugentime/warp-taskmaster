const { test, expect } = require('@playwright/test');

test('Final bot creation debug with correct button text', async ({ page }) => {
    console.log('🎯 Final debug: Looking for "Create Bot" buttons...');
    
    // Capture all console messages including errors
    const consoleMessages = [];
    page.on('console', (msg) => {
        const message = {
            type: msg.type(),
            text: msg.text(),
            timestamp: new Date().toISOString()
        };
        consoleMessages.push(message);
        
        // Log important messages immediately
        if (msg.type() === 'error') {
            console.log(`🔴 JS Error: ${msg.text()}`);
        } else if (msg.text().includes('bot') || msg.text().includes('launch') || msg.text().includes('create')) {
            console.log(`🔍 Bot Debug: [${msg.type()}] ${msg.text()}`);
        }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
        console.log(`🚨 Page Error: ${error.message}`);
        console.log(`📍 Stack: ${error.stack}`);
    });

    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    
    // Wait for data to load
    console.log('⏳ Waiting for funding data to load...');
    await page.waitForTimeout(8000);
    
    // Look for "Create Bot" buttons instead of "Implement"
    const createBotButtons = await page.locator('button:has-text("Create Bot")').count();
    console.log(`🎯 Found ${createBotButtons} "Create Bot" buttons`);
    
    if (createBotButtons === 0) {
        console.log('❌ No "Create Bot" buttons found. Checking what buttons exist...');
        
        // Find all buttons on the page
        const allButtons = await page.locator('button').all();
        console.log(`🔘 Total buttons on page: ${allButtons.length}`);
        
        for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
            const buttonText = await allButtons[i].textContent();
            console.log(`Button ${i + 1}: "${buttonText}"`);
        }
        
        // Check for funding opportunities tables
        const tables = await page.locator('table').count();
        console.log(`📋 Found ${tables} tables`);
        
        if (tables > 0) {
            for (let i = 0; i < tables; i++) {
                const tableText = await page.locator('table').nth(i).textContent();
                console.log(`📄 Table ${i + 1} preview: ${tableText.substring(0, 200)}...`);
            }
        }
        
        // Take screenshot
        await page.screenshot({ path: 'tests/final-debug-no-buttons.png', fullPage: true });
        console.log('📸 Screenshot saved: tests/final-debug-no-buttons.png');
        return;
    }
    
    console.log('✅ Found Create Bot buttons! Testing bot creation...');
    
    // Click the first Create Bot button
    const firstButton = page.locator('button:has-text("Create Bot")').first();
    await firstButton.click();
    console.log('🔘 Clicked first Create Bot button');
    
    // Wait for modal
    await page.waitForTimeout(2000);
    
    // Look for the modal
    const modal = page.locator('.modal, [role="dialog"], div:has-text("Create Arbitrage Bot"), div:has-text("Configure and launch")').first();
    
    if (await modal.isVisible()) {
        console.log('✅ Bot creation modal opened');
        
        // Take screenshot before filling
        await page.screenshot({ path: 'tests/final-debug-modal-opened.png', fullPage: true });
        
        // Fill the form
        await page.fill('input[id="botName"], input[placeholder*="Bot"]', 'Final Debug Bot');
        console.log('📝 Filled bot name');
        
        await page.fill('input[id="investment"], input[placeholder*="1000"]', '10');
        console.log('📝 Filled investment amount');
        
        // Check risk acknowledgment
        await page.check('input[type="checkbox"]:has(~ label:has-text("risk"))');
        console.log('☑️ Checked risk acknowledgment');
        
        // Wait a moment for form validation
        await page.waitForTimeout(1000);
        
        // Take screenshot before launch
        await page.screenshot({ path: 'tests/final-debug-before-launch.png', fullPage: true });
        
        // Click Launch Bot
        const launchButton = page.locator('button:has-text("Launch Bot")');
        if (await launchButton.isVisible()) {
            console.log('🚀 Clicking Launch Bot...');
            
            // Click and immediately start monitoring for errors
            await launchButton.click();
            
            // Wait and watch for responses/errors
            await page.waitForTimeout(8000);
            
            // Take final screenshot
            await page.screenshot({ path: 'tests/final-debug-after-launch.png', fullPage: true });
            
        } else {
            console.log('❌ Launch Bot button not visible');
        }
        
    } else {
        console.log('❌ Modal did not open');
        await page.screenshot({ path: 'tests/final-debug-no-modal.png', fullPage: true });
    }
    
    // Report all captured console messages
    console.log('\n=================== CONSOLE MESSAGES ===================');
    const errorMessages = consoleMessages.filter(msg => 
        msg.type === 'error' || 
        msg.text.toLowerCase().includes('error') ||
        msg.text.toLowerCase().includes('fail') ||
        msg.text.toLowerCase().includes('bot') ||
        msg.text.toLowerCase().includes('launch')
    );
    
    errorMessages.forEach((msg, index) => {
        console.log(`${index + 1}. [${msg.type.toUpperCase()}] ${msg.text}`);
    });
    console.log('=================== END MESSAGES ===================\n');
});
