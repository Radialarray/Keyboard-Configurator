import { test, expect } from '@playwright/test';

test.describe('Dashboard smoke tests', () => {
	test.beforeEach(async ({ page }) => {
		// Mock the health check API to avoid backend dependency
		await page.route('**/api/health', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					status: 'ok',
					version: '0.10.0'
				})
			});
		});
	});

	test('loads the dashboard page', async ({ page }) => {
		await page.goto('/');
		
		// Check that the main heading is visible
		await expect(page.getByRole('heading', { name: 'LazyQMK Dashboard' })).toBeVisible();
		
		// Check that the backend status card is present
		await expect(page.getByRole('heading', { name: 'Backend Status', level: 2 })).toBeVisible();
		
		// Check that navigation cards are present by their headings
		await expect(page.getByRole('heading', { name: 'Layouts', level: 2 })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Keycodes', level: 2 })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Settings', level: 2 })).toBeVisible();
	});

	test('navigates to layouts page', async ({ page }) => {
		await page.goto('/');
		
		// Click the "View Layouts" button
		await page.getByRole('button', { name: 'View Layouts' }).click();
		
		// Should navigate to /layouts
		await expect(page).toHaveURL('/layouts');
		await expect(page.getByRole('heading', { name: 'Layouts' })).toBeVisible();
	});

	test('navigates to keycodes page', async ({ page }) => {
		await page.goto('/');
		
		// Click the "Browse Keycodes" button
		await page.getByRole('button', { name: 'Browse Keycodes' }).click();
		
		// Should navigate to /keycodes
		await expect(page).toHaveURL('/keycodes');
		await expect(page.getByRole('heading', { name: 'Keycodes Browser' })).toBeVisible();
	});

	test('navigates to settings page', async ({ page }) => {
		await page.goto('/');
		
		// Click the "Open Settings" button
		await page.getByRole('button', { name: 'Open Settings' }).click();
		
		// Should navigate to /settings
		await expect(page).toHaveURL('/settings');
		await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
	});
});
