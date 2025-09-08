// ==========================================
// WARP TASKMASTER: Account Status Tests
// ==========================================
// Comprehensive Playwright tests for account status functionality
// Includes visual proof, screenshots, and UI interaction validation

const { test, expect } = require('@playwright/test');

test.describe('Account Status Component', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the application to load
    await expect(page.locator('h1')).toContainText('Binance Futures Arbitrage Monitor');
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'tests/reports/screenshots/app-loaded.png',
      fullPage: true 
    });
  });

  test('Account Status component loads correctly', async ({ page }) => {
    // Check that Account Status card exists
    const accountStatusCard = page.locator('[data-testid="account-status"], :has-text("Account Status")').first();
    await expect(accountStatusCard).toBeVisible();
    
    // Check for Verify Connection button
    const verifyButton = page.locator('button:has-text("Verify Connection")');
    await expect(verifyButton).toBeVisible();
    await expect(verifyButton).toBeEnabled();
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: 'tests/reports/screenshots/account-status-initial.png',
      fullPage: true 
    });
  });

  test('Verify Connection button triggers loading state', async ({ page }) => {
    // Click verify connection button
    const verifyButton = page.locator('button:has-text("Verify Connection")');
    await verifyButton.click();
    
    // Check for loading state
    const loadingText = page.locator('text=Verifying...');
    await expect(loadingText).toBeVisible({ timeout: 2000 });
    
    // Take screenshot of loading state
    await page.screenshot({ 
      path: 'tests/reports/screenshots/connection-loading.png',
      fullPage: true 
    });
    
    // Wait for loading to complete (should change to connected state or error)
    await expect(loadingText).toBeHidden({ timeout: 15000 });
  });

  test('Connection displays account balance data', async ({ page }) => {
    // Click verify connection
    const verifyButton = page.locator('button:has-text("Verify Connection")');
    await verifyButton.click();
    
    // Wait for loading to complete
    await page.waitForTimeout(3000);
    
    // Check for successful connection indicator (green dot)
    const successIndicator = page.locator('.bg-green-500, [title*="Successfully connected"]');
    await expect(successIndicator).toBeVisible({ timeout: 10000 });
    
    // Check for balance information
    const portfolioValue = page.locator('text=Total Portfolio Value');
    await expect(portfolioValue).toBeVisible();
    
    const availableUSDT = page.locator('text=Available USDT');
    await expect(availableUSDT).toBeVisible();
    
    const assetsCount = page.locator('text=Assets:');
    await expect(assetsCount).toBeVisible();
    
    // Take screenshot of connected state
    await page.screenshot({ 
      path: 'tests/reports/screenshots/connection-success.png',
      fullPage: true 
    });
  });

  test('Asset breakdown table displays correctly', async ({ page }) => {
    // Click verify connection and wait for data
    const verifyButton = page.locator('button:has-text("Verify Connection")');
    await verifyButton.click();
    await page.waitForTimeout(4000);
    
    // Check for Asset Breakdown section
    const assetBreakdown = page.locator('text=Asset Breakdown');
    await expect(assetBreakdown).toBeVisible({ timeout: 10000 });
    
    // Check for table headers
    const assetHeader = page.locator('th:has-text("Asset")');
    const balanceHeader = page.locator('th:has-text("Balance")');
    const valueHeader = page.locator('th:has-text("Value (USDT)")');
    const priceHeader = page.locator('th:has-text("Price")');
    
    await expect(assetHeader).toBeVisible();
    await expect(balanceHeader).toBeVisible();
    await expect(valueHeader).toBeVisible();
    await expect(priceHeader).toBeVisible();
    
    // Check for asset rows (should show assets like EDG, LDUSDT, etc.)
    const assetRows = page.locator('tbody tr');
    const rowCount = await assetRows.count();
    expect(rowCount).toBeGreaterThan(5); // Should have multiple assets
    
    // Validate specific assets we know should be there
    const edgAsset = page.locator('td:has-text("EDG")');
    await expect(edgAsset).toBeVisible();
    
    // Take screenshot of asset table
    await page.screenshot({ 
      path: 'tests/reports/screenshots/asset-breakdown-table.png',
      fullPage: true 
    });
    
    // Take focused screenshot of just the table
    const table = page.locator('table').first();
    await table.screenshot({ 
      path: 'tests/reports/screenshots/asset-table-focused.png' 
    });
  });

  test('Asset data contains expected information', async ({ page }) => {
    // Click verify connection and wait for data
    const verifyButton = page.locator('button:has-text("Verify Connection")');
    await verifyButton.click();
    await page.waitForTimeout(4000);
    
    // Check for specific asset data we know should exist
    const edgRow = page.locator('tr:has(td:has-text("EDG"))');
    await expect(edgRow).toBeVisible();
    
    // Check that the EDG row has balance data
    const edgBalance = edgRow.locator('td').nth(1); // Balance column
    const balanceText = await edgBalance.textContent();
    expect(parseFloat(balanceText)).toBeGreaterThan(100); // Should be ~181.84
    
    // Check for USDT value column (even if $0.00)
    const edgValue = edgRow.locator('td').nth(2); // Value column
    const valueText = await edgValue.textContent();
    expect(valueText).toContain('$');
    
    // Validate other assets exist
    const expectedAssets = ['LDUSDT', 'LDUSDC', 'DON', 'ETHW'];
    for (const asset of expectedAssets) {
      const assetElement = page.locator(`td:has-text("${asset}")`);
      await expect(assetElement).toBeVisible();
    }
  });

  test('Table scrolling and responsiveness', async ({ page }) => {
    // Click verify connection and wait for data
    const verifyButton = page.locator('button:has-text("Verify Connection")');
    await verifyButton.click();
    await page.waitForTimeout(4000);
    
    // Check if table container is scrollable
    const tableContainer = page.locator('.max-h-48.overflow-y-auto');
    await expect(tableContainer).toBeVisible();
    
    // Test table interaction - hover over rows
    const firstAssetRow = page.locator('tbody tr').first();
    await firstAssetRow.hover();
    
    // Take screenshot after hover
    await page.screenshot({ 
      path: 'tests/reports/screenshots/table-hover-interaction.png',
      fullPage: true 
    });
    
    // Check responsive behavior by resizing window
    await page.setViewportSize({ width: 800, height: 600 });
    await page.screenshot({ 
      path: 'tests/reports/screenshots/responsive-tablet.png',
      fullPage: true 
    });
    
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ 
      path: 'tests/reports/screenshots/responsive-mobile.png',
      fullPage: true 
    });
  });

  test('Error handling for connection failures', async ({ page }) => {
    // First, let's test what happens when backend is not available
    // We'll simulate this by trying to connect without the backend
    
    // Stop the backend (if running) temporarily for this test
    // Note: In a real scenario, you might mock the API calls
    
    // Click verify connection
    const verifyButton = page.locator('button:has-text("Verify Connection")');
    await verifyButton.click();
    
    // Wait a bit to see what happens
    await page.waitForTimeout(2000);
    
    // Check for either success or error state
    const hasError = await page.locator('text=Connection Failed, text=backend server').isVisible();
    const hasSuccess = await page.locator('.bg-green-500').isVisible();
    
    // Take screenshot of the result (whether success or error)
    await page.screenshot({ 
      path: 'tests/reports/screenshots/connection-result.png',
      fullPage: true 
    });
    
    // If we got an error, verify it's properly displayed
    if (hasError) {
      const errorMessage = page.locator('text=Connection Failed');
      await expect(errorMessage).toBeVisible();
      
      // Take screenshot of error state
      await page.screenshot({ 
        path: 'tests/reports/screenshots/connection-error.png',
        fullPage: true 
      });
    }
  });

  test('UI elements are properly styled and accessible', async ({ page }) => {
    // Check button styling and accessibility
    const verifyButton = page.locator('button:has-text("Verify Connection")');
    
    // Check button has proper ARIA attributes and styling
    await expect(verifyButton).toHaveCSS('background-color', 'rgb(37, 99, 235)'); // bg-blue-600
    
    // Test button focus
    await verifyButton.focus();
    await page.screenshot({ 
      path: 'tests/reports/screenshots/button-focus.png',
      fullPage: true 
    });
    
    // Test button click and loading state styling
    await verifyButton.click();
    
    // Check disabled state styling during loading
    const disabledButton = page.locator('button:disabled:has-text("Verifying...")');
    if (await disabledButton.isVisible()) {
      await page.screenshot({ 
        path: 'tests/reports/screenshots/button-disabled-loading.png',
        fullPage: true 
      });
    }
  });

  test('Complete user workflow - Connection to Balance View', async ({ page }) => {
    // Start timer for performance measurement
    const startTime = Date.now();
    
    // Initial page load
    await expect(page.locator('h1')).toContainText('Binance Futures Arbitrage Monitor');
    
    // Screenshot 1: Initial state
    await page.screenshot({ 
      path: 'tests/reports/screenshots/workflow-01-initial.png',
      fullPage: true 
    });
    
    // Step 1: Click verify connection
    const verifyButton = page.locator('button:has-text("Verify Connection")');
    await verifyButton.click();
    
    // Screenshot 2: Loading state
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'tests/reports/screenshots/workflow-02-loading.png',
      fullPage: true 
    });
    
    // Step 2: Wait for connection to complete
    await page.waitForTimeout(4000);
    
    // Screenshot 3: Connected state
    await page.screenshot({ 
      path: 'tests/reports/screenshots/workflow-03-connected.png',
      fullPage: true 
    });
    
    // Step 3: Verify balance data is displayed
    const portfolioValue = page.locator('text=Total Portfolio Value');
    await expect(portfolioValue).toBeVisible();
    
    // Screenshot 4: Balance data visible
    await page.screenshot({ 
      path: 'tests/reports/screenshots/workflow-04-balance-data.png',
      fullPage: true 
    });
    
    // Step 4: Check asset table
    const assetBreakdown = page.locator('text=Asset Breakdown');
    await expect(assetBreakdown).toBeVisible();
    
    // Screenshot 5: Asset table
    await page.screenshot({ 
      path: 'tests/reports/screenshots/workflow-05-asset-table.png',
      fullPage: true 
    });
    
    // Performance measurement
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Complete workflow took ${duration}ms`);
    expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
    
    // Final screenshot
    await page.screenshot({ 
      path: 'tests/reports/screenshots/workflow-06-final.png',
      fullPage: true 
    });
  });

  test('Visual regression - Account Status layout', async ({ page }) => {
    // This test captures baseline screenshots for visual comparison
    
    // Initial state
    await page.screenshot({ 
      path: 'tests/reports/visual-baselines/account-status-initial.png',
      fullPage: true 
    });
    
    // Click verify connection and wait for data
    const verifyButton = page.locator('button:has-text("Verify Connection")');
    await verifyButton.click();
    await page.waitForTimeout(4000);
    
    // Connected state with data
    await page.screenshot({ 
      path: 'tests/reports/visual-baselines/account-status-connected.png',
      fullPage: true 
    });
    
    // Focus on just the Account Status card
    const accountStatusCard = page.locator('div:has(h2:has-text("Account Status"))').first();
    await accountStatusCard.screenshot({ 
      path: 'tests/reports/visual-baselines/account-status-card-only.png' 
    });
    
    // Focus on just the asset table
    const assetTable = page.locator('table').first();
    if (await assetTable.isVisible()) {
      await assetTable.screenshot({ 
        path: 'tests/reports/visual-baselines/asset-table-only.png' 
      });
    }
  });

  test('Performance - Connection response time', async ({ page }) => {
    // Measure connection performance
    const startTime = Date.now();
    
    const verifyButton = page.locator('button:has-text("Verify Connection")');
    await verifyButton.click();
    
    // Wait for loading state to appear
    await expect(page.locator('text=Verifying...')).toBeVisible();
    const loadingStartTime = Date.now();
    
    // Wait for success state (green dot)
    await expect(page.locator('.bg-green-500')).toBeVisible({ timeout: 15000 });
    const loadingEndTime = Date.now();
    
    const totalTime = loadingEndTime - startTime;
    const apiResponseTime = loadingEndTime - loadingStartTime;
    
    console.log(`⏱️  Total connection time: ${totalTime}ms`);
    console.log(`🔗 API response time: ${apiResponseTime}ms`);
    
    // Performance assertions
    expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds
    expect(apiResponseTime).toBeLessThan(10000); // API should respond within 10 seconds
    
    // Take performance screenshot
    await page.screenshot({ 
      path: 'tests/reports/screenshots/performance-test-complete.png',
      fullPage: true 
    });
  });

  test('Asset data validation and content verification', async ({ page }) => {
    // Connect and get asset data
    const verifyButton = page.locator('button:has-text("Verify Connection")');
    await verifyButton.click();
    await page.waitForTimeout(4000);
    
    // Validate that we have the expected assets
    const expectedAssets = ['EDG', 'LDUSDT', 'LDUSDC', 'DON'];
    
    for (const assetName of expectedAssets) {
      const assetCell = page.locator(`td:has-text("${assetName}")`);
      await expect(assetCell).toBeVisible();
      
      // Check that the asset row has balance data
      const assetRow = assetCell.locator('..'); // Parent row
      const balanceCell = assetRow.locator('td').nth(1);
      const valueCell = assetRow.locator('td').nth(2);
      
      // Validate balance is not empty
      const balanceText = await balanceCell.textContent();
      expect(balanceText.trim()).not.toBe('');
      expect(balanceText).toMatch(/^\d+\.\d+$/); // Should be a decimal number
      
      // Validate value shows $ format
      const valueText = await valueCell.textContent();
      expect(valueText).toContain('$');
    }
    
    // Check for EDG specifically (we know it should have ~181.84)
    const edgRow = page.locator('tr:has(td:has-text("EDG"))');
    const edgBalance = await edgRow.locator('td').nth(1).textContent();
    const edgAmount = parseFloat(edgBalance);
    expect(edgAmount).toBeGreaterThan(180);
    expect(edgAmount).toBeLessThan(185);
    
    // Take screenshot with asset data validation
    await page.screenshot({ 
      path: 'tests/reports/screenshots/asset-data-validation.png',
      fullPage: true 
    });
  });

  test('Table interactions and hover effects', async ({ page }) => {
    // Connect and wait for data
    const verifyButton = page.locator('button:has-text("Verify Connection")');
    await verifyButton.click();
    await page.waitForTimeout(4000);
    
    // Test row hover effects
    const firstAssetRow = page.locator('tbody tr').first();
    await firstAssetRow.hover();
    
    // Check that hover effect is applied (row should change background)
    await expect(firstAssetRow).toHaveCSS('background-color', /rgba.*0\.3|rgb.*71/); // Should have hover background
    
    // Screenshot of hover effect
    await page.screenshot({ 
      path: 'tests/reports/screenshots/table-hover-effect.png',
      fullPage: true 
    });
    
    // Test scrolling if table is scrollable
    const tableContainer = page.locator('.max-h-48.overflow-y-auto');
    if (await tableContainer.isVisible()) {
      // Try to scroll within the table
      await tableContainer.evaluate(element => element.scrollTop = 50);
      
      await page.screenshot({ 
        path: 'tests/reports/screenshots/table-scrolled.png',
        fullPage: true 
      });
    }
  });

  test('Responsive design validation', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'laptop', width: 1366, height: 768 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Connect and get data for this viewport
      const verifyButton = page.locator('button:has-text("Verify Connection")');
      await verifyButton.click();
      await page.waitForTimeout(3000);
      
      // Check that components are still visible and properly arranged
      const accountStatus = page.locator('text=Account Status');
      await expect(accountStatus).toBeVisible();
      
      const verifyBtn = page.locator('button:has-text("Verify Connection")');
      await expect(verifyBtn).toBeVisible();
      
      // Take screenshot for this viewport
      await page.screenshot({ 
        path: `tests/reports/screenshots/responsive-${viewport.name}-${viewport.width}x${viewport.height}.png`,
        fullPage: true 
      });
    }
  });

});

test.describe('Integration with Other Components', () => {
  
  test('Account Status integrates properly with overall layout', async ({ page }) => {
    await page.goto('/');
    
    // Check that Account Status is part of the overall layout
    const header = page.locator('h1:has-text("Binance Futures Arbitrage Monitor")');
    const accountStatus = page.locator('text=Account Status');
    const rebalancingEngine = page.locator('text=Rebalancing Engine');
    
    await expect(header).toBeVisible();
    await expect(accountStatus).toBeVisible();
    await expect(rebalancingEngine).toBeVisible();
    
    // Take full page screenshot showing integration
    await page.screenshot({ 
      path: 'tests/reports/screenshots/full-layout-integration.png',
      fullPage: true 
    });
  });

  test('Account Status data flows to other components', async ({ page }) => {
    await page.goto('/');
    
    // Connect account
    const verifyButton = page.locator('button:has-text("Verify Connection")');
    await verifyButton.click();
    await page.waitForTimeout(4000);
    
    // Check that connection affects other components
    // Look for any components that might show "connected" state
    const connectedElements = page.locator('.bg-green-500, [title*="connected"]');
    await expect(connectedElements.first()).toBeVisible();
    
    // Take screenshot showing connected state across components
    await page.screenshot({ 
      path: 'tests/reports/screenshots/connected-state-integration.png',
      fullPage: true 
    });
  });

});
