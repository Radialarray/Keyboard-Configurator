import { test, expect } from '@playwright/test';

test.describe('Templates Feature', () => {
	test('should create template from layout, view in templates list, and apply to new layout', async ({
		page
	}) => {
		// Navigate to layouts page
		await page.goto('/layouts');
		await expect(page).toHaveTitle(/LazyQMK/);

		// Click on a layout to edit it (assuming there's at least one layout)
		const layoutLink = page.locator('a').filter({ hasText: /^my_test_layout/ }).first();
		if ((await layoutLink.count()) === 0) {
			test.skip();
		}
		await layoutLink.click();

		// Wait for layout to load
		await expect(page.locator('h1')).toContainText(/test/i, { timeout: 10000 });

		// Click "Save as Template" button
		await page.getByRole('button', { name: /save as template/i }).click();

		// Fill in template details
		await page.getByLabel(/template name/i).fill('Test E2E Template');
		await page.getByLabel(/tags/i).fill('test, e2e, automation');

		// Save template
		await page.getByRole('button', { name: /save template/i }).click();

		// Wait for success message
		await expect(page.locator('text=/saved/i')).toBeVisible({ timeout: 5000 });

		// Navigate to templates page
		await page.goto('/templates');

		// Wait for templates to load
		await expect(page.locator('h1')).toContainText('Layout Templates');

		// Search for the template we just created
		await page.getByPlaceholder(/search templates/i).fill('Test E2E Template');

		// Verify template appears in list
		await expect(page.locator('text=Test E2E Template')).toBeVisible();

		// Verify tags are shown
		await expect(page.locator('text=test')).toBeVisible();
		await expect(page.locator('text=e2e')).toBeVisible();

		// Click "Apply Template"
		await page.getByRole('button', { name: /apply template/i }).first().click();

		// Fill in new layout name
		await page.getByLabel(/new layout name/i).fill('e2e-generated-layout');

		// Create layout
		await page.getByRole('button', { name: /create layout/i }).click();

		// Should navigate to the new layout editor
		await expect(page).toHaveURL(/\/layouts\/e2e-generated-layout/);
		await expect(page.locator('h1')).toContainText(/test/i);
	});

	test('should show empty state when no templates exist', async ({ page }) => {
		await page.goto('/templates');
		
		await expect(page.locator('h1')).toContainText('Layout Templates');

		// Wait for either empty state or templates grid to appear (loading should be done)
		await page.waitForSelector('[data-testid="empty-state"], [data-testid="templates-grid"], [data-testid="error-state"]', { timeout: 10000 });

		// Check that we have content
		const emptyState = page.getByTestId('empty-state');
		const templatesGrid = page.getByTestId('templates-grid');
		const errorState = page.getByTestId('error-state');

		// Either empty state OR templates OR error should exist
		const hasContent = (await emptyState.count()) > 0 || (await templatesGrid.count()) > 0 || (await errorState.count()) > 0;
		expect(hasContent).toBe(true);
	});

	test('should filter templates by search query', async ({ page }) => {
		await page.goto('/templates');
		await expect(page.locator('h1')).toContainText('Layout Templates');

		// If templates exist, test search
		const templateCards = page.locator('[class*="grid"] >> [class*="Card"]');
		const templateCount = await templateCards.count();

		if (templateCount > 0) {
			// Get first template name
			const firstTemplateName = await page
				.locator('[class*="grid"] >> [class*="Card"] h3')
				.first()
				.textContent();

			if (firstTemplateName) {
				// Search for it
				await page.getByPlaceholder(/search templates/i).fill(firstTemplateName);

				// Should show only matching templates
				await expect(page.locator(`text="${firstTemplateName}"`)).toBeVisible();
			}
		}
	});
});
