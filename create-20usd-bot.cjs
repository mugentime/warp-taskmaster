const { chromium } = require('playwright');

async function create20USDBot() {
    console.log('🚀 Starting $20 USD Bot Creation Process...');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000 // Slow down for visibility
    });
    
    const page = await browser.newPage();
    
    try {
        // Navigate to dashboard
        console.log('📱 Opening dashboard at http://localhost:4173');
        await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
        
        // Wait for funding data to load
        console.log('⏳ Waiting for arbitrage opportunities to load...');
        await page.waitForTimeout(8000);
        
        // Find the first Create Bot button (best opportunity)
        console.log('🔍 Looking for Create Bot buttons...');
        const createBotButtons = await page.locator('button:has-text("Create Bot")').count();
        console.log(`Found ${createBotButtons} Create Bot buttons`);
        
        if (createBotButtons === 0) {
            throw new Error('No Create Bot buttons found');
        }
        
        // Click the first Create Bot button (highest rated opportunity)
        console.log('🎯 Clicking first Create Bot button (best opportunity)...');
        await page.locator('button:has-text("Create Bot")').first().click();
        
        // Wait for modal to open
        await page.waitForTimeout(2000);
        
        // Check if modal opened
        const modal = page.locator('div:has-text("Create Arbitrage Bot"), div:has-text("Configure and launch")').first();
        if (!(await modal.isVisible())) {
            throw new Error('Bot creation modal did not open');
        }
        
        console.log('✅ Bot creation modal opened successfully');
        
        // Fill the bot configuration form
        console.log('📝 Filling bot configuration...');
        
        // Bot name
        await page.fill('input[id="botName"], input[placeholder*="Bot"]', '$20 Arbitrage Bot - ' + new Date().toLocaleTimeString());
        console.log('  ✅ Bot name filled');
        
        // Investment amount ($20 USD)
        await page.fill('input[id="investment"], input[placeholder*="1000"]', '20');
        console.log('  ✅ Investment amount set to $20 USD');
        
        // Set leverage to a conservative 3x (optional - slider might already be at good default)
        try {
            const leverageSlider = page.locator('input[type="range"][id="leverage"]');
            if (await leverageSlider.isVisible()) {
                await leverageSlider.fill('3');
                console.log('  ✅ Leverage set to 3x (conservative)');
            }
        } catch (error) {
            console.log('  ⚠️ Could not adjust leverage, using default');
        }
        
        // Check risk acknowledgment
        await page.check('input[type="checkbox"]:has(~ label:has-text("risk"))');
        console.log('  ✅ Risk acknowledgment checked');
        
        // Optional: Enable auto-rebalance for better performance
        try {
            await page.check('input[type="checkbox"]:has(~ label:has-text("Auto"))');
            console.log('  ✅ Auto-rebalance enabled');
        } catch (error) {
            console.log('  ⚠️ Auto-rebalance checkbox not found, continuing...');
        }
        
        // Wait a moment for form validation
        await page.waitForTimeout(1500);
        
        // Take screenshot before launching
        await page.screenshot({ path: 'bot-creation-preview.png', fullPage: true });
        console.log('📸 Screenshot saved: bot-creation-preview.png');
        
        // Check if Launch Bot button is enabled
        const launchButton = page.locator('button:has-text("Launch Bot")');
        const isLaunchEnabled = await launchButton.isEnabled();
        
        if (!isLaunchEnabled) {
            console.log('❌ Launch Bot button is not enabled. Checking form validation...');
            
            // Check what might be missing
            const botName = await page.inputValue('input[id="botName"], input[placeholder*="Bot"]');
            const investment = await page.inputValue('input[id="investment"], input[placeholder*="1000"]');
            const riskChecked = await page.isChecked('input[type="checkbox"]:has(~ label:has-text("risk"))');
            
            console.log(`  Bot Name: "${botName}" (${botName ? '✅' : '❌'})`);
            console.log(`  Investment: "${investment}" (${investment && parseFloat(investment) > 0 ? '✅' : '❌'})`);
            console.log(`  Risk Acknowledged: ${riskChecked ? '✅' : '❌'}`);
            
            throw new Error('Launch Bot button is not enabled - check form validation');
        }
        
        console.log('🚀 Launch Bot button is enabled! Ready to create bot...');
        console.log('');
        console.log('⚠️  NOTE: This would normally launch a real bot with real money.');
        console.log('📊 Bot Configuration Summary:');
        console.log('   💰 Investment: $20 USD');
        console.log('   📈 Strategy: Arbitrage (Short Perp / Buy Spot)');
        console.log('   ⚖️  Leverage: ~3x (conservative)');
        console.log('   🔄 Auto-Rebalance: Enabled');
        console.log('   🛡️  Risk Management: Active');
        console.log('');
        console.log('🎯 To complete bot creation, click the Launch Bot button in the modal.');
        console.log('   (Automated clicking disabled to prevent accidental real trades)');
        
        // Keep browser open for manual review
        console.log('');
        console.log('🔍 Browser will remain open for your review.');
        console.log('   Close this terminal to close the browser.');
        console.log('   Or manually click "Launch Bot" to proceed.');
        
        // Wait indefinitely (user can close terminal to exit)
        await page.waitForTimeout(300000); // 5 minutes max, then auto-close
        
    } catch (error) {
        console.error('❌ Bot creation failed:', error.message);
        await page.screenshot({ path: 'bot-creation-error.png', fullPage: true });
        console.log('📸 Error screenshot saved: bot-creation-error.png');
    } finally {
        console.log('🔚 Closing browser...');
        await browser.close();
    }
}

// Run the bot creation process
create20USDBot().catch(console.error);
