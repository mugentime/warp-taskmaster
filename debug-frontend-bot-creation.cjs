const { chromium } = require('playwright');

async function debugFrontendBotCreation() {
    console.log('🔍 Starting Frontend Bot Creation Debug...');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 500
    });
    
    const page = await browser.newPage();
    
    // Capture all console messages
    const consoleMessages = [];
    page.on('console', (msg) => {
        const message = {
            type: msg.type(),
            text: msg.text(),
            timestamp: new Date().toISOString()
        };
        consoleMessages.push(message);
        
        if (msg.type() === 'error' || msg.text().toLowerCase().includes('error')) {
            console.log(`🔴 JS Error: ${msg.text()}`);
        } else if (msg.text().toLowerCase().includes('bot') || msg.text().toLowerCase().includes('launch')) {
            console.log(`🤖 Bot Debug: [${msg.type()}] ${msg.text()}`);
        }
    });
    
    // Capture page errors
    page.on('pageerror', (error) => {
        console.log(`🚨 Page Error: ${error.message}`);
    });
    
    // Capture failed network requests
    page.on('requestfailed', (request) => {
        console.log(`🌐 Network Error: ${request.method()} ${request.url()} - ${request.failure().errorText}`);
    });
    
    try {
        // Navigate to dashboard
        console.log('📱 Opening dashboard...');
        await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
        
        // Wait for data to load
        console.log('⏳ Waiting for arbitrage opportunities to load...');
        await page.waitForTimeout(8000);
        
        // Check for Create Bot buttons
        console.log('🔍 Checking for Create Bot buttons...');
        const createBotButtons = await page.locator('button:has-text("Create Bot")').count();
        console.log(`Found ${createBotButtons} Create Bot buttons`);
        
        if (createBotButtons === 0) {
            console.log('❌ No Create Bot buttons found. Checking page content...');
            
            // Check if data is loading
            const loadingElements = await page.locator('text=Loading, text=loading, [data-testid*="loading"], .loading').count();
            console.log(`Loading elements: ${loadingElements}`);
            
            // Check if opportunities table exists
            const tables = await page.locator('table').count();
            console.log(`Tables found: ${tables}`);
            
            // Check API endpoints
            console.log('🌐 Testing API endpoints...');
            const response = await page.evaluate(async () => {
                try {
                    const resp = await fetch('http://localhost:3001/api/v1/arbitrage-opportunities');
                    const data = await resp.json();
                    return { success: true, count: data.opportunities?.length || 0 };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });
            
            console.log(`API Test Result: ${JSON.stringify(response)}`);
            
            // Take screenshot for analysis
            await page.screenshot({ path: 'debug-no-buttons.png', fullPage: true });
            console.log('📸 Screenshot saved: debug-no-buttons.png');
            
            return;
        }
        
        console.log('✅ Found Create Bot buttons! Testing modal interaction...');
        
        // Click first Create Bot button
        await page.locator('button:has-text("Create Bot")').first().click();
        console.log('🎯 Clicked first Create Bot button');
        
        // Wait for modal
        await page.waitForTimeout(3000);
        
        // Check if modal opened
        const modal = page.locator('div:has-text("Create Arbitrage Bot"), div:has-text("Configure and launch")').first();
        const isModalVisible = await modal.isVisible();
        
        if (!isModalVisible) {
            console.log('❌ Modal did not open. Checking for modal elements...');
            
            // Check for any modals
            const anyModal = await page.locator('[role="dialog"], .modal, .fixed.inset-0').count();
            console.log(`Modal elements found: ${anyModal}`);
            
            // Check for overlay
            const overlay = await page.locator('.bg-black.bg-opacity-75, .modal-overlay').count();
            console.log(`Overlay elements found: ${overlay}`);
            
            await page.screenshot({ path: 'debug-no-modal.png', fullPage: true });
            console.log('📸 Screenshot saved: debug-no-modal.png');
            
            return;
        }
        
        console.log('✅ Modal opened successfully!');
        await page.screenshot({ path: 'debug-modal-opened.png', fullPage: true });
        
        // Test form filling
        console.log('📝 Testing form fields...');
        
        try {
            // Test bot name field
            const botNameField = page.locator('input[id="botName"], input[placeholder*="Bot"]');
            await botNameField.fill('Debug Test Bot');
            const botNameValue = await botNameField.inputValue();
            console.log(`✅ Bot name field: "${botNameValue}"`);
        } catch (error) {
            console.log(`❌ Bot name field error: ${error.message}`);
        }
        
        try {
            // Test investment field
            const investmentField = page.locator('input[id="investment"], input[placeholder*="1000"]');
            await investmentField.fill('25');
            const investmentValue = await investmentField.inputValue();
            console.log(`✅ Investment field: "${investmentValue}"`);
        } catch (error) {
            console.log(`❌ Investment field error: ${error.message}`);
        }
        
        try {
            // Test risk acknowledgment checkbox
            const riskCheckbox = page.locator('input[type="checkbox"]:has(~ label:has-text("risk"))');
            await riskCheckbox.check();
            const isChecked = await riskCheckbox.isChecked();
            console.log(`✅ Risk checkbox: ${isChecked ? 'checked' : 'not checked'}`);
        } catch (error) {
            console.log(`❌ Risk checkbox error: ${error.message}`);
        }
        
        // Check Launch Bot button
        try {
            const launchButton = page.locator('button:has-text("Launch Bot")');
            const isEnabled = await launchButton.isEnabled();
            const isVisible = await launchButton.isVisible();
            console.log(`🚀 Launch Bot button - Visible: ${isVisible}, Enabled: ${isEnabled}`);
            
            if (isVisible && isEnabled) {
                console.log('✅ Launch Bot button is ready to click');
                
                // Test clicking (but don't actually launch without real API keys)
                console.log('⚠️ Would click Launch Bot here, but stopping to prevent real API calls');
                
                await page.screenshot({ path: 'debug-ready-to-launch.png', fullPage: true });
                console.log('📸 Screenshot saved: debug-ready-to-launch.png');
            } else {
                console.log('❌ Launch Bot button is not ready');
            }
        } catch (error) {
            console.log(`❌ Launch button error: ${error.message}`);
        }
        
        // Keep browser open briefly for manual inspection
        console.log('🔍 Keeping browser open for 30 seconds for manual inspection...');
        await page.waitForTimeout(30000);
        
    } catch (error) {
        console.error(`❌ Debug failed: ${error.message}`);
        await page.screenshot({ path: 'debug-error.png', fullPage: true });
        console.log('📸 Error screenshot saved: debug-error.png');
    }
    
    // Report console messages
    console.log('\n=================== CONSOLE MESSAGES ===================');
    const importantMessages = consoleMessages.filter(msg => 
        msg.type === 'error' || 
        msg.text.toLowerCase().includes('error') ||
        msg.text.toLowerCase().includes('bot') ||
        msg.text.toLowerCase().includes('launch') ||
        msg.text.toLowerCase().includes('fail')
    );
    
    importantMessages.forEach((msg, index) => {
        console.log(`${index + 1}. [${msg.type.toUpperCase()}] ${msg.text}`);
    });
    console.log('=================== END MESSAGES ===================\n');
    
    await browser.close();
    console.log('🔚 Debug complete');
}

// Run debug
debugFrontendBotCreation().catch(console.error);
