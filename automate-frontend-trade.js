// Automated Frontend Trade Execution Script
// This script automates the frontend to create a real trade without manual API key entry

(async function automateTrade() {
    console.log('🚀 Starting automated frontend trade execution...');
    
    // API credentials from backend .env
    const apiKey = "KP5NFDffn3reE3md2SKkrcRTgTLwJKrE7wvBVNizdZfuBswKGVbBTluopkmofax1";
    const apiSecret = "2bUXyAuNY0zjrlXWi5xC8DDmVxkhOtYu7W6RwstZ33Ytr7jzins2SUemRCDpLIV5";
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
        // Step 1: Fill API Key Configuration
        console.log('📝 Step 1: Filling API configuration...');
        
        const apiKeyInput = document.querySelector('[data-testid="api-key-input"]') || 
                           document.querySelector('input[placeholder*="API Key"]') ||
                           document.querySelector('input[type="text"]');
        
        const apiSecretInput = document.querySelector('[data-testid="api-secret-input"]') || 
                              document.querySelector('input[placeholder*="Secret"]') ||
                              document.querySelector('input[type="password"]');
        
        if (apiKeyInput && apiSecretInput) {
            apiKeyInput.value = apiKey;
            apiKeyInput.dispatchEvent(new Event('input', { bubbles: true }));
            apiKeyInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            apiSecretInput.value = apiSecret;
            apiSecretInput.dispatchEvent(new Event('input', { bubbles: true }));
            apiSecretInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            console.log('✅ API keys filled');
            
            // Click connect/test button
            const connectButton = document.querySelector('[data-testid="test-connection-button"]') ||
                                 document.querySelector('button[type="button"]') ||
                                 document.querySelector('button:contains("Connect")') ||
                                 document.querySelector('button:contains("Test")');
            
            if (connectButton) {
                connectButton.click();
                console.log('🔌 Connection test initiated');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        
        // Step 2: Configure Trading Bot
        console.log('🤖 Step 2: Configuring trading bot...');
        
        // Find bot creator section
        const simpleBotCreator = document.querySelector('[data-testid="simple-bot-creator"]');
        const bestOpportunityBotCreator = document.querySelector('[data-testid="best-opportunity-bot-creator"]');
        
        const botCreator = bestOpportunityBotCreator || simpleBotCreator;
        
        if (botCreator) {
            // Set investment amount
            const investmentInput = botCreator.querySelector('[data-testid="bot-investment-input"]') ||
                                   botCreator.querySelector('[data-testid="investment-input"]') ||
                                   botCreator.querySelector('input[type="number"]');
            
            if (investmentInput) {
                investmentInput.value = '15'; // $15 USDT
                investmentInput.dispatchEvent(new Event('input', { bubbles: true }));
                investmentInput.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('💰 Investment set to $15');
            }
            
            // Set leverage
            const leverageSelect = botCreator.querySelector('[data-testid="bot-leverage-select"]') ||
                                  botCreator.querySelector('[data-testid="leverage-select"]') ||
                                  botCreator.querySelector('select');
            
            if (leverageSelect) {
                leverageSelect.value = '1'; // 1x leverage for safety
                leverageSelect.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('⚖️ Leverage set to 1x');
            }
            
            // Disable dry run to create REAL trade
            const dryRunCheckbox = botCreator.querySelector('[data-testid="dry-run-checkbox"]') ||
                                  botCreator.querySelector('input[type="checkbox"]');
            
            if (dryRunCheckbox && dryRunCheckbox.checked) {
                dryRunCheckbox.click();
                console.log('🔥 DRY RUN DISABLED - REAL TRADE MODE!');
            }
            
            // Enable auto convert
            const autoConvertCheckbox = botCreator.querySelector('[data-testid="auto-convert-checkbox"]');
            if (autoConvertCheckbox && !autoConvertCheckbox.checked) {
                autoConvertCheckbox.click();
                console.log('🔄 Auto convert enabled');
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Step 3: Create the bot!
            console.log('🚀 Step 3: Creating REAL trade...');
            
            const createBotButton = botCreator.querySelector('[data-testid="create-bot-button"]') ||
                                   botCreator.querySelector('button[type="button"]:not([disabled])') ||
                                   botCreator.querySelector('button:contains("Create")');
            
            if (createBotButton && !createBotButton.disabled) {
                console.log('🎯 Clicking CREATE BOT button...');
                createBotButton.click();
                
                // Wait for response
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Check for success/error messages
                const successMessage = document.querySelector('[data-testid="bot-success-message"]') ||
                                      document.querySelector('[data-testid="success-message"]') ||
                                      document.querySelector('.text-green-400');
                
                const errorMessage = document.querySelector('[data-testid="opportunity-error-message"]') ||
                                    document.querySelector('[data-testid="error-message"]') ||
                                    document.querySelector('.text-red-400');
                
                if (successMessage) {
                    console.log('🎉🎉🎉 REAL TRADE CREATED SUCCESSFULLY! 🎉🎉🎉');
                    console.log('Success:', successMessage.textContent);
                } else if (errorMessage) {
                    console.log('❌ Trade creation failed:', errorMessage.textContent);
                } else {
                    console.log('⏳ Trade creation in progress... Check the Active Bots section');
                }
                
            } else {
                console.log('❌ Create bot button not found or disabled');
                console.log('Button element:', createBotButton);
            }
            
        } else {
            console.log('❌ Bot creator section not found');
        }
        
    } catch (error) {
        console.error('❌ Automation error:', error);
    }
    
    console.log('🏁 Automation script completed');
})();

// Instructions to run:
// 1. Open your browser to http://localhost:4173/
// 2. Open Developer Tools (F12)
// 3. Go to Console tab
// 4. Copy and paste this entire script
// 5. Press Enter to execute
