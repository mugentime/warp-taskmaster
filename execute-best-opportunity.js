// 🎯 EXECUTE CURRENT BEST OPPORTUNITY + COMPREHENSIVE LOGGING
// Paste this into browser console on http://localhost:4173/

console.log("🚀 EXECUTING CURRENT BEST OPPORTUNITY WITH FULL LOGGING");

// Set up comprehensive error and log capture
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const logs = [];
const errors = [];

// Override console methods to capture everything
console.log = function(...args) {
    logs.push({ type: 'LOG', timestamp: new Date().toISOString(), data: args });
    originalConsoleLog.apply(console, args);
};
console.error = function(...args) {
    errors.push({ type: 'ERROR', timestamp: new Date().toISOString(), data: args });
    originalConsoleError.apply(console, args);
};
console.warn = function(...args) {
    errors.push({ type: 'WARN', timestamp: new Date().toISOString(), data: args });
    originalConsoleWarn.apply(console, args);
};

// Capture network errors
const originalFetch = window.fetch;
window.fetch = function(...args) {
    console.log('🌐 FETCH REQUEST:', args[0], args[1]);
    return originalFetch.apply(this, args)
        .then(response => {
            console.log('✅ FETCH RESPONSE:', response.status, response.statusText, args[0]);
            return response;
        })
        .catch(error => {
            console.error('❌ FETCH ERROR:', error, args[0]);
            throw error;
        });
};

// Function to inject API keys
function injectAPIKeys() {
    console.log("🔑 Injecting API keys...");
    
    // Set API keys in localStorage/sessionStorage if app uses them
    localStorage.setItem('apiKey', 'KP5NFDffn3reE3md2SKkrcRTgTLwJKrE7wvBVNizdZfuBswKGVbBTluopkmofax1');
    localStorage.setItem('apiSecret', '2bUXyAuNY0zjrlXWi5xC8DDmVxkhOtYu7W6RwstZ33Ytr7jzins2SUemRCDpLIV5');
    
    // Try to fill input fields if they exist
    const apiKeyInput = document.querySelector('input[type="text"][placeholder*="API"], input[name*="api"], input[id*="api"]');
    const apiSecretInput = document.querySelector('input[type="password"], input[name*="secret"], input[id*="secret"]');
    
    if (apiKeyInput) {
        apiKeyInput.value = 'KP5NFDffn3reE3md2SKkrcRTgTLwJKrE7wvBVNizdZfuBswKGVbBTluopkmofax1';
        apiKeyInput.dispatchEvent(new Event('input', { bubbles: true }));
        apiKeyInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log("✅ API Key injected into input field");
    }
    
    if (apiSecretInput) {
        apiSecretInput.value = '2bUXyAuNY0zjrlXWi5xC8DDmVxkhOtYu7W6RwstZ33Ytr7jzins2SUemRCDpLIV5';
        apiSecretInput.dispatchEvent(new Event('input', { bubbles: true }));
        apiSecretInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log("✅ API Secret injected into input field");
    }
    
    console.log("🔑 API keys injection completed");
}

// Function to find and click the Current Best Opportunity button
async function executeCurrentBestOpportunity() {
    console.log("🎯 Looking for 'Current Best Opportunity' button...");
    
    // Multiple selectors to find the button
    const selectors = [
        'button:contains("Current Best Opportunity")',
        'button:contains("Best Opportunity")',
        'button:contains("Execute")',
        '[data-testid*="opportunity"]',
        '[id*="opportunity"]',
        '[class*="opportunity"]',
        'button[onclick*="opportunity"]'
    ];
    
    let button = null;
    
    // Try different ways to find the button
    for (let selector of selectors) {
        try {
            if (selector.includes(':contains')) {
                // Handle contains selector manually
                const text = selector.match(/contains\("([^"]+)"\)/)[1];
                button = Array.from(document.querySelectorAll('button')).find(btn => 
                    btn.textContent.toLowerCase().includes(text.toLowerCase())
                );
            } else {
                button = document.querySelector(selector);
            }
            
            if (button) {
                console.log(`✅ Found button with selector: ${selector}`);
                break;
            }
        } catch (e) {
            console.log(`❌ Selector failed: ${selector}`, e);
        }
    }
    
    if (!button) {
        // Fallback: look for any button with relevant text
        const allButtons = document.querySelectorAll('button, [role="button"], .btn');
        console.log(`🔍 Searching through ${allButtons.length} buttons...`);
        
        for (let btn of allButtons) {
            const text = btn.textContent || btn.innerText || btn.value || btn.title;
            console.log(`Button text: "${text}"`);
            if (text && (
                text.toLowerCase().includes('opportunity') ||
                text.toLowerCase().includes('execute') ||
                text.toLowerCase().includes('launch') ||
                text.toLowerCase().includes('trade') ||
                text.toLowerCase().includes('best')
            )) {
                button = btn;
                console.log(`✅ Found button by text: "${text}"`);
                break;
            }
        }
    }
    
    if (button) {
        console.log("🎯 EXECUTING CURRENT BEST OPPORTUNITY...");
        console.log("Button element:", button);
        console.log("Button text:", button.textContent);
        console.log("Button classes:", button.className);
        
        // Try multiple click methods
        try {
            button.click();
            console.log("✅ Button clicked with .click()");
        } catch (e) {
            console.error("❌ .click() failed:", e);
            try {
                button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                console.log("✅ Button clicked with dispatchEvent");
            } catch (e2) {
                console.error("❌ dispatchEvent failed:", e2);
            }
        }
        
        // Wait for response and capture results
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log("⏳ Waited 3 seconds for response...");
        
    } else {
        console.error("❌ Could not find 'Current Best Opportunity' button");
        console.log("📋 Available buttons:", Array.from(document.querySelectorAll('button')).map(b => b.textContent));
    }
}

// Function to capture and display all results
function displayResults() {
    console.log("\n" + "=".repeat(50));
    console.log("📊 EXECUTION RESULTS SUMMARY");
    console.log("=".repeat(50));
    
    console.log(`\n📝 Total Logs Captured: ${logs.length}`);
    logs.forEach((log, i) => {
        console.log(`${i+1}. [${log.timestamp}] ${log.type}:`, ...log.data);
    });
    
    console.log(`\n❌ Total Errors/Warnings: ${errors.length}`);
    errors.forEach((error, i) => {
        console.log(`${i+1}. [${error.timestamp}] ${error.type}:`, ...error.data);
    });
    
    console.log(`\n🌐 Network Activity:`);
    console.log("Check the Network tab for API calls to localhost:3001");
    
    console.log("\n" + "=".repeat(50));
    
    // Also create a copy-paste friendly summary
    const summary = {
        execution_time: new Date().toISOString(),
        total_logs: logs.length,
        total_errors: errors.length,
        logs: logs,
        errors: errors,
        page_url: window.location.href,
        user_agent: navigator.userAgent
    };
    
    console.log("📋 COPY THIS SUMMARY:");
    console.log(JSON.stringify(summary, null, 2));
}

// Main execution function
async function main() {
    try {
        console.log("🚀 Starting Current Best Opportunity execution...");
        
        // Step 1: Inject API keys
        injectAPIKeys();
        
        // Step 2: Wait a moment for any async loading
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 3: Execute the opportunity
        await executeCurrentBestOpportunity();
        
        // Step 4: Wait for completion and display results
        await new Promise(resolve => setTimeout(resolve, 5000));
        displayResults();
        
    } catch (error) {
        console.error("💥 EXECUTION FAILED:", error);
    }
}

// Run the main function
main();

console.log("📋 INSTRUCTIONS:");
console.log("1. Make sure you're on http://localhost:4173/");
console.log("2. This script will inject API keys automatically");  
console.log("3. It will find and click the 'Current Best Opportunity' button");
console.log("4. It will capture all logs, errors, and network activity");
console.log("5. Results will be displayed in 8 seconds");
console.log("6. Copy the JSON summary at the end for detailed analysis");
