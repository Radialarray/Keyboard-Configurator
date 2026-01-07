import { test, expect } from '@playwright/test';

// Mock preflight response for returning user (not first run)
const mockPreflightReturningUser = {
	qmk_configured: true,
	has_layouts: true,
	first_run: false,
	qmk_firmware_path: '/path/to/qmk_firmware'
};

// Mock preflight response for first-run user
const mockPreflightFirstRun = {
	qmk_configured: false,
	has_layouts: false,
	first_run: true,
	qmk_firmware_path: null
};

test.describe('Dashboard smoke tests', () => {
	test.beforeEach(async ({ page }) => {
		// Mock the preflight API to simulate returning user
		await page.route('**/api/preflight', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockPreflightReturningUser)
			});
		});

		// Mock the health check API
		await page.route('**/health', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					status: 'ok',
					version: '0.12.0'
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
		await expect(page.getByRole('heading', { name: 'Settings', level: 2 })).toBeVisible();
	});

	test('shows QMK configured status', async ({ page }) => {
		await page.goto('/');

		// Should show QMK Configured status
		await expect(page.getByText('QMK Configured')).toBeVisible();
	});

	test('navigates to layouts page', async ({ page }) => {
		await page.goto('/');

		// Click the "View Layouts" button
		await page.getByRole('button', { name: 'View Layouts' }).click();

		// Should navigate to /layouts
		await expect(page).toHaveURL('/layouts');
		await expect(page.getByRole('heading', { name: 'Layouts' })).toBeVisible();
	});

	test('navigates to settings page', async ({ page }) => {
		await page.goto('/');

		// Click the "Open Settings" button
		await page.getByRole('button', { name: 'Open Settings' }).click();

		// Should navigate to /settings
		await expect(page).toHaveURL('/settings');
		await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
	});

	test('navigates to onboarding page for new layout', async ({ page }) => {
		await page.goto('/');

		// Click the "Create New Layout" button
		await page.getByRole('button', { name: 'Create New Layout' }).click();

		// Should navigate to /onboarding
		await expect(page).toHaveURL('/onboarding');
	});
});

test.describe('Dashboard first-run redirect', () => {
	test('redirects to onboarding on first run', async ({ page }) => {
		// Mock preflight to indicate first run
		await page.route('**/api/preflight', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockPreflightFirstRun)
			});
		});

		await page.goto('/');

		// Should redirect to onboarding
		await expect(page).toHaveURL('/onboarding');
	});

	test('shows onboarding welcome message after redirect', async ({ page }) => {
		await page.route('**/api/preflight', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockPreflightFirstRun)
			});
		});

		await page.goto('/');

		// Should show welcome heading
		await expect(page.getByRole('heading', { name: 'Welcome to LazyQMK' })).toBeVisible();
	});
});

test.describe('Dashboard QMK not configured', () => {
	test('shows QMK Not Configured with link to settings', async ({ page }) => {
		await page.route('**/api/preflight', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					qmk_configured: false,
					has_layouts: true,  // Has layouts so not first_run
					first_run: false,
					qmk_firmware_path: null
				})
			});
		});

		await page.route('**/health', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					status: 'ok',
					version: '0.12.0'
				})
			});
		});

		await page.goto('/');

		// Should show QMK Not Configured status
		await expect(page.getByText('QMK Not Configured')).toBeVisible();

		// Should show link to configure
		await expect(page.getByRole('link', { name: /Configure QMK path/i })).toBeVisible();
	});
});
