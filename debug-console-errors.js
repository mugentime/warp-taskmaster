// CONSOLE ERROR DEBUGGING AUTOMATION
// This script captures and analyzes all console errors in the browser

(function debugConsoleErrors() {
    console.clear();
    console.log('🔍 STARTING CONSOLE ERROR ANALYSIS...');
    
    // Store original console methods
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;
    
    // Arrays to store captured errors
    const capturedErrors = [];
    const capturedWarnings = [];
    const networkErrors = [];
    
    // Override console methods to capture errors
    console.error = function(...args) {
        capturedErrors.push({
            timestamp: new Date().toISOString(),
            message: args.join(' '),
            stack: new Error().stack
        });
        originalError.apply(console, args);
    };
    
    console.warn = function(...args) {
        capturedWarnings.push({
            timestamp: new Date().toISOString(),
            message: args.join(' ')
        });
        originalWarn.apply(console, args);
    };
    
    // Monitor network errors
    window.addEventListener('error', (e) => {
        if (e.target !== window) {
            networkErrors.push({
                type: 'Resource Error',
                message: `Failed to load: ${e.target.src || e.target.href}`,
                element: e.target.tagName,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // Monitor unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
        capturedErrors.push({
            timestamp: new Date().toISOString(),
            message: `Unhandled Promise Rejection: ${e.reason}`,
            type: 'Promise Rejection'
        });
    });
    
    // Function to analyze and categorize errors
    function analyzeErrors() {
        console.log('\n📊 CONSOLE ERROR ANALYSIS RESULTS:');
        console.log('=====================================');
        
        // 1. Network/Resource Errors
        if (networkErrors.length > 0) {
            console.log('\n🌐 NETWORK/RESOURCE ERRORS:');
            networkErrors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.type}: ${error.message}`);
                
                // Provide fixes for common network errors
                if (error.message.includes('index.css')) {
                    console.log('   🔧 FIX: CSS file not loading - check build process');
                } else if (error.message.includes('tailwindcss.com')) {
                    console.log('   🔧 FIX: Replace CDN with local Tailwind installation');
                } else if (error.message.includes('.js')) {
                    console.log('   🔧 FIX: JavaScript file missing - check build output');
                }
            });
        }
        
        // 2. JavaScript Errors
        if (capturedErrors.length > 0) {
            console.log('\n❌ JAVASCRIPT ERRORS:');
            capturedErrors.forEach((error, index) => {
                console.log(`${index + 1}. ${error.message}`);
                
                // Provide fixes for common JS errors
                if (error.message.includes('undefined')) {
                    console.log('   🔧 FIX: Undefined variable/property - check variable initialization');
                } else if (error.message.includes('fetch')) {
                    console.log('   🔧 FIX: API call failed - check backend server and endpoints');
                } else if (error.message.includes('React')) {
                    console.log('   🔧 FIX: React error - check component props and state');
                } else if (error.message.includes('CORS')) {
                    console.log('   🔧 FIX: CORS error - configure backend CORS settings');
                }
            });
        }
        
        // 3. Warnings
        if (capturedWarnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            capturedWarnings.forEach((warning, index) => {
                console.log(`${index + 1}. ${warning.message}`);
                
                // Provide fixes for common warnings
                if (warning.message.includes('tailwindcss.com')) {
                    console.log('   🔧 FIX: Install Tailwind locally instead of using CDN');
                } else if (warning.message.includes('CSS')) {
                    console.log('   🔧 FIX: CSS loading issue - check file paths and server');
                } else if (warning.message.includes('React')) {
                    console.log('   🔧 FIX: React warning - update component implementation');
                }
            });
        }
        
        // 4. Performance Issues
        console.log('\n🚀 PERFORMANCE CHECK:');
        const performanceEntries = performance.getEntriesByType('navigation');
        if (performanceEntries.length > 0) {
            const nav = performanceEntries[0];
            console.log(`Page Load Time: ${nav.loadEventEnd - nav.fetchStart}ms`);
            console.log(`DOM Ready: ${nav.domContentLoadedEventEnd - nav.fetchStart}ms`);
        }
        
        // 5. API Health Check
        console.log('\n🔗 API HEALTH CHECK:');
        checkAPIHealth();
        
        // 6. Browser Compatibility
        console.log('\n🌐 BROWSER COMPATIBILITY:');
        console.log(`User Agent: ${navigator.userAgent}`);
        console.log(`Fetch Support: ${typeof fetch !== 'undefined' ? '✅' : '❌'}`);
        console.log(`LocalStorage Support: ${typeof localStorage !== 'undefined' ? '✅' : '❌'}`);
        
        // 7. Suggested Fixes
        console.log('\n🔧 AUTOMATED FIXES TO APPLY:');
        suggestFixes();
    }
    
    // API Health Check function
    async function checkAPIHealth() {
        try {
            const response = await fetch('http://localhost:3001/api/v1/arbitrage-opportunities?limit=1');
            if (response.ok) {
                console.log('Backend API: ✅ Connected');
            } else {
                console.log('Backend API: ❌ Error', response.status);
            }
        } catch (error) {
            console.log('Backend API: ❌ Not reachable', error.message);
        }
    }
    
    // Suggest automated fixes
    function suggestFixes() {
        console.log('1. 🎨 CSS Fix: Replace Tailwind CDN with local installation');
        console.log('2. 🔧 Build Fix: Ensure all assets are properly built');
        console.log('3. 🌐 CORS Fix: Add proper CORS headers to backend');
        console.log('4. 📡 API Fix: Verify backend server is running');
        console.log('5. 🗂️  Path Fix: Check all file paths and imports');
        
        // Attempt to fix Tailwind CSS issue automatically
        if (capturedWarnings.some(w => w.message.includes('tailwindcss.com'))) {
            console.log('\n🚀 ATTEMPTING AUTOMATIC CSS FIX...');
            attemptTailwindFix();
        }
    }
    
    // Attempt to fix Tailwind CSS issue
    function attemptTailwindFix() {
        // Remove CDN link
        const cdnLinks = document.querySelectorAll('script[src*="tailwindcss.com"]');
        cdnLinks.forEach(link => {
            console.log('🔧 Removing Tailwind CDN link:', link.src);
            link.remove();
        });
        
        // Check if local CSS exists
        const localCSS = document.querySelector('link[href*="index.css"]');
        if (localCSS) {
            console.log('✅ Local CSS found:', localCSS.href);
        } else {
            console.log('❌ No local CSS found - build may be incomplete');
        }
    }
    
    // Monitor for new errors for 10 seconds
    console.log('📡 Monitoring for errors... (10 seconds)');
    setTimeout(() => {
        analyzeErrors();
        
        // Generate final report
        console.log('\n📋 FINAL ERROR REPORT:');
        console.log(`Total Errors: ${capturedErrors.length}`);
        console.log(`Total Warnings: ${capturedWarnings.length}`);
        console.log(`Network Issues: ${networkErrors.length}`);
        
        if (capturedErrors.length === 0 && capturedWarnings.length <= 2 && networkErrors.length === 0) {
            console.log('🎉 CONSOLE IS CLEAN! No critical errors found.');
        } else {
            console.log('🔧 Issues found - apply suggested fixes above');
        }
        
        // Restore original console methods
        console.error = originalError;
        console.warn = originalWarn;
        console.log = originalLog;
        
        console.log('\n🏁 Console error analysis completed!');
    }, 10000);
    
})();

// Instructions:
// 1. Go to http://localhost:4173/ in your browser
// 2. Open Developer Tools (F12)
// 3. Click Console tab
// 4. Paste this entire script and press Enter
// 5. Wait 10 seconds for complete analysis
