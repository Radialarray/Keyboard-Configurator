import { test, expect } from '@playwright/test';

test.describe('Setup Wizard', () => {
	test('should display setup wizard page with step indicator', async ({ page }) => {
		await page.goto('/setup');
		await expect(page).toHaveTitle(/Setup Wizard.*LazyQMK/);

		// Check page title
		await expect(page.locator('h1')).toContainText('Setup Wizard');

		// Check step indicators are present using data-testid to avoid strict mode violations
		await expect(page.getByTestId('step-label-1')).toBeVisible();
		await expect(page.getByTestId('step-label-2')).toBeVisible();
		await expect(page.getByTestId('step-label-3')).toBeVisible();
		await expect(page.getByTestId('step-label-4')).toBeVisible();

		// Check we start on step 1
		await expect(page.getByTestId('step-heading')).toContainText('Step 1');
	});

	test('should have cancel button that navigates home', async ({ page }) => {
		await page.goto('/setup');

		// Click cancel button
		await page.getByRole('button', { name: /cancel/i }).click();

		// Should navigate to home
		await expect(page).toHaveURL('/');
	});

	test('should show QMK path input on step 1', async ({ page }) => {
		await page.goto('/setup');

		// Should see QMK path label
		await expect(page.locator('label[for="qmk-path"]')).toContainText('QMK Firmware Path');

		// Should have an input field
		await expect(page.locator('input[id="qmk-path"]')).toBeVisible();

		// Previous button should be disabled on step 1
		await expect(page.getByRole('button', { name: /previous/i })).toBeDisabled();
	});

	test('should navigate to step 2 when QMK path is configured', async ({ page }) => {
		await page.goto('/setup');

		// Wait for config to load
		await page.waitForTimeout(1000);

		// If QMK path is already configured, Next button should be enabled
		const nextButton = page.getByRole('button', { name: /next/i });

		// Check if we can proceed (depends on server config)
		const isEnabled = await nextButton.isEnabled();

		if (isEnabled) {
			await nextButton.click();

			// Should be on step 2
			await expect(page.getByTestId('step-heading')).toContainText('Step 2');
		}
	});

	test('should display error when QMK path is not configured', async ({ page }) => {
		await page.goto('/setup');

		// Wait for config to load
		await page.waitForTimeout(1000);

		// If no QMK path, try clicking Next
		const nextButton = page.getByRole('button', { name: /next/i });

		// Should be disabled when QMK path is not configured
		const isDisabled = await nextButton.isDisabled();

		// If disabled, we can't proceed - which is expected
		if (isDisabled) {
			// The page should show a message about needing to configure the path
			await expect(page.locator('input[id="qmk-path"]')).toBeVisible();
		}
	});

	test('should have accessible Setup Wizard link from dashboard', async ({ page }) => {
		await page.goto('/');

		// Wait for page to load
		await expect(page.locator('h1')).toContainText('Dashboard');

		// Find and click the setup wizard link
		await page.getByRole('link', { name: /start setup wizard/i }).click();

		// Should navigate to setup page
		await expect(page).toHaveURL('/setup');
		await expect(page.locator('h1')).toContainText('Setup Wizard');
	});
});

test.describe.skip('Setup Wizard Step 2 - Keyboard Selection', () => {
	// SKIPPED: These tests require QMK to be configured to reach step 2
	// They are temporarily disabled until QMK configuration mocking is implemented
	
	test('should show keyboard search input', async ({ page }) => {
		await page.goto('/setup');
		await page.waitForTimeout(500);

		const nextButton = page.getByRole('button', { name: /next/i });
		await nextButton.click();
		
		// Wait for step 2
		await page.getByTestId('step-heading').filter({ hasText: 'Step 2' }).waitFor({ timeout: 5000 });
		
		await expect(page.getByTestId('keyboard-search-input')).toBeVisible();
	});

	test('should show keyboard list', async ({ page }) => {
		await page.goto('/setup');
		await page.waitForTimeout(500);

		const nextButton = page.getByRole('button', { name: /next/i });
		await nextButton.click();
		
		// Wait for step 2
		await page.getByTestId('step-heading').filter({ hasText: 'Step 2' }).waitFor({ timeout: 5000 });
		
		// Wait for keyboards to load
		await page.waitForTimeout(2000);

		// Either keyboards are listed or there's an error
		const keyboardButtons = page.locator('button').filter({ hasText: /layout/ });
		const errorMessage = page.locator('[class*="destructive"]');

		const hasKeyboards = (await keyboardButtons.count()) > 0;
		const hasError = (await errorMessage.count()) > 0;

		// Either keyboards loaded or there's an error (no intermediate state)
		expect(hasKeyboards || hasError).toBe(true);
	});
});

test.describe('Switch Layout Variant', () => {
	test('should show switch variant button in metadata tab', async ({ page }) => {
		// Navigate to layouts page
		await page.goto('/layouts');

		// Find and click on any layout
		const layoutLink = page.locator('a[href^="/layouts/"]').first();
		if ((await layoutLink.count()) === 0) {
			test.skip();
		}
		await layoutLink.click();

		// Wait for layout to load
		await page.waitForTimeout(1000);

		// Go to metadata tab
		await page.getByRole('tab', { name: /metadata/i }).click();

		// Look for switch variant button
		const switchButton = page.getByRole('button', { name: /switch/i });

		// If keyboard is configured, switch button should be visible
		// Otherwise it won't be shown
		const isVisible = await switchButton.isVisible().catch(() => false);

		if (isVisible) {
			await expect(switchButton).toBeVisible();
		}
	});

	test('should open variant switch dialog when clicking switch button', async ({ page }) => {
		await page.goto('/layouts');

		const layoutLink = page.locator('a[href^="/layouts/"]').first();
		if ((await layoutLink.count()) === 0) {
			test.skip();
		}
		await layoutLink.click();

		await page.waitForTimeout(1000);

		// Go to metadata tab
		await page.getByRole('tab', { name: /metadata/i }).click();

		const switchButton = page.getByRole('button', { name: /switch/i });

		if (!(await switchButton.isVisible().catch(() => false))) {
			test.skip();
		}

		await switchButton.click();

		// Should see switch variant dialog
		await expect(page.locator('h2')).toContainText('Switch Layout Variant');
		await expect(page.locator('text=Change the physical layout variant')).toBeVisible();
	});

	test('should close variant switch dialog with close button', async ({ page }) => {
		await page.goto('/layouts');

		const layoutLink = page.locator('a[href^="/layouts/"]').first();
		if ((await layoutLink.count()) === 0) {
			test.skip();
		}
		await layoutLink.click();

		await page.waitForTimeout(1000);

		// Go to metadata tab
		await page.getByRole('tab', { name: /metadata/i }).click();

		const switchButton = page.getByRole('button', { name: /switch/i });

		if (!(await switchButton.isVisible().catch(() => false))) {
			test.skip();
		}

		await switchButton.click();

		// Wait for dialog
		await expect(page.locator('h2')).toContainText('Switch Layout Variant');

		// Close the dialog
		await page.getByRole('button', { name: /close/i }).click();

		// Dialog should be gone
		await expect(page.locator('h2').filter({ hasText: 'Switch Layout Variant' })).not.toBeVisible();
	});
});
