const { chromium } = require('playwright');

async function testBotLaunchError() {
    console.log('🧪 Testing what happens when user clicks Launch Bot...');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 800
    });
    
    const page = await browser.newPage();
    
    // Capture console messages
    page.on('console', (msg) => {
        if (msg.type() === 'error' || msg.text().toLowerCase().includes('error')) {
            console.log(`🔴 JS Error: ${msg.text()}`);
        } else if (msg.text().toLowerCase().includes('bot') || msg.text().toLowerCase().includes('launch')) {
            console.log(`🤖 Bot Launch: ${msg.text()}`);
        }
    });
    
    try {
        await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
        console.log('📱 Dashboard loaded');
        
        // Wait for opportunities to load
        await page.waitForTimeout(8000);
        
        // Click Create Bot button
        await page.locator('button:has-text("Create Bot")').first().click();
        console.log('🎯 Clicked Create Bot button');
        
        await page.waitForTimeout(2000);
        
        // Fill form
        await page.fill('input[id="botName"]', 'Test Launch Bot');
        await page.fill('input[id="investment"]', '15');
        await page.check('input[type="checkbox"]:has(~ label:has-text("risk"))');
        
        console.log('📝 Form filled');
        
        // Take screenshot before launch
        await page.screenshot({ path: 'test-before-launch.png', fullPage: true });
        
        // Click Launch Bot to see what error appears
        console.log('🚀 Clicking Launch Bot to demonstrate the error...');
        await page.locator('button:has-text("Launch Bot")').click();
        
        // Wait to see the error
        await page.waitForTimeout(5000);
        
        // Take screenshot after launch attempt
        await page.screenshot({ path: 'test-after-launch-error.png', fullPage: true });
        console.log('📸 Screenshots saved showing the launch attempt and expected error');
        
        // Check for error messages or modal changes
        const errorElements = await page.locator('text=error, text=Error, text=fail, text=Fail, text=missing, text=required').count();
        console.log(`🔍 Found ${errorElements} potential error messages on page`);
        
        // Keep browser open briefly
        console.log('🔍 Keeping browser open for 15 seconds to see the result...');
        await page.waitForTimeout(15000);
        
    } catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
        await page.screenshot({ path: 'test-error.png', fullPage: true });
    }
    
    await browser.close();
    console.log('🔚 Test complete - This shows the user experience when trying to launch a bot');
}

testBotLaunchError().catch(console.error);
