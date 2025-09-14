import { test, expect } from '@playwright/test';

// Basic smoke test to verify frontend functionality
test('basic frontend smoke test', async ({ page }) => {
  // Navigate to homepage
  await test.step('Navigate to homepage', async () => {
    await page.goto('/');
    await expect(page).toHaveTitle(/TaskMaster/);
  });
  
  // Verify main components load
  await test.step('Verify main UI components', async () => {
    // Header should be visible
    await expect(page.locator('header')).toBeVisible();
    
    // Main navigation should be present
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    
    // Dashboard link should exist
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
  });
  
  // Test basic navigation
  await test.step('Test navigation', async () => {
    // Click dashboard link
    await page.getByRole('link', { name: /dashboard/i }).click();
    await expect(page.url()).toContain('/dashboard');
    
    // Wait for dashboard content
    await expect(page.locator('main')).toBeVisible();
  });
});