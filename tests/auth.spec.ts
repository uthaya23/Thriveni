import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should load the login page successfully', async ({ page }) => {
    // Navigate to the base URL (which redirects to /login if not authenticated)
    await page.goto('/');

    // Verify the page title or a specific element on the login page
    await expect(page.locator('h1')).toContainText('REBUILT CENTER');
    
    // Verify the login form elements exist
    await expect(page.getByPlaceholder('Enter username')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    // Fill in invalid credentials
    await page.getByPlaceholder('Enter username').fill('invalid_user');
    await page.getByPlaceholder('••••••••').fill('wrongpassword123');
    
    // Click Sign In
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Check for the react-hot-toast error message
    // (Assuming toast messages appear in the DOM)
    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });
});
