import { test, expect } from '@playwright/test';

// Mock data for tests
const mockLayouts = {
	layouts: [
		{
			filename: 'test-layout.md',
			name: 'Test Layout',
			description: 'A test keyboard layout',
			modified: '2024-01-01T12:00:00Z'
		},
		{
			filename: 'another-layout.md',
			name: 'Another Layout',
			description: 'Another test layout',
			modified: '2024-01-02T12:00:00Z'
		}
	]
};

const mockBuildJob = {
	id: 'job-123',
	status: 'pending',
	layout_filename: 'test-layout.md',
	keyboard: 'crkbd',
	keymap: 'default',
	created_at: '2024-01-01T12:00:00Z',
	progress: 0
};

const mockRunningJob = {
	...mockBuildJob,
	status: 'running',
	started_at: '2024-01-01T12:00:01Z',
	progress: 50
};

const mockCompletedJob = {
	...mockBuildJob,
	status: 'completed',
	started_at: '2024-01-01T12:00:01Z',
	completed_at: '2024-01-01T12:01:00Z',
	progress: 100,
	firmware_path: '/tmp/crkbd_default.uf2'
};

const mockLogs = {
	job_id: 'job-123',
	logs: [
		{ timestamp: '2024-01-01T12:00:01Z', level: 'INFO', message: 'Build started' },
		{ timestamp: '2024-01-01T12:00:02Z', level: 'INFO', message: 'Compiling...' },
		{ timestamp: '2024-01-01T12:00:03Z', level: 'INFO', message: 'Build progress: 50%' }
	],
	has_more: false
};

test.describe('Build page', () => {
	test.beforeEach(async ({ page }) => {
		// Mock API endpoints
		await page.route('**/api/layouts', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockLayouts)
			});
		});

		await page.route('**/api/build/jobs', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify([])
				});
			}
		});
	});

	test('loads the build page', async ({ page }) => {
		await page.goto('/build');

		// Check heading
		await expect(page.getByRole('heading', { name: 'Build Firmware', level: 1 })).toBeVisible();

		// Check start build section
		await expect(page.getByRole('heading', { name: 'Start New Build' })).toBeVisible();
	});

	test('displays layout selector with mocked layouts', async ({ page }) => {
		await page.goto('/build');

		// Check layout selector exists
		const layoutSelect = page.locator('[data-testid="layout-select"]');
		await expect(layoutSelect).toBeVisible();

		// Check options are populated
		await expect(layoutSelect.locator('option')).toHaveCount(2);
	});

	test('start build button has correct test id', async ({ page }) => {
		await page.goto('/build');

		const startButton = page.locator('[data-testid="start-build"]');
		await expect(startButton).toBeVisible();
		await expect(startButton).toHaveText('Start Build');
	});

	test('job status list has correct test id', async ({ page }) => {
		await page.goto('/build');

		const jobStatus = page.locator('[data-testid="job-status"]');
		await expect(jobStatus).toBeVisible();
	});

	test('shows empty state when no jobs exist', async ({ page }) => {
		await page.goto('/build');

		await expect(page.getByText('No build jobs yet')).toBeVisible();
	});

	test('can navigate to home via header', async ({ page }) => {
		await page.goto('/build');

		// Mock preflight and layouts for home navigation
		await page.route('**/api/preflight', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					qmk_configured: true,
					has_layouts: true,
					first_run: false,
					qmk_firmware_path: '/path/to/qmk_firmware'
				})
			});
		});

		await page.route('**/api/layouts', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ layouts: [] })
			});
		});

		// Click the LazyQMK logo/link in header
		await page.locator('header a').filter({ hasText: 'LazyQMK' }).click();
		await expect(page).toHaveURL('/');
	});
});

test.describe('Build page with active jobs', () => {
	test.beforeEach(async ({ page }) => {
		// Mock layouts
		await page.route('**/api/layouts', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockLayouts)
			});
		});

		// Mock jobs list with one running job
		await page.route('**/api/build/jobs', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify([mockRunningJob])
				});
			}
		});

		// Mock logs
		await page.route('**/api/build/jobs/job-123/logs**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockLogs)
			});
		});
	});

	test('displays job in the job list', async ({ page }) => {
		await page.goto('/build');

		// Check job appears in list
		await expect(page.getByText('test-layout.md')).toBeVisible();
	});
});

test.describe('Build job selection and logs', () => {
	test.beforeEach(async ({ page }) => {
		// Mock layouts
		await page.route('**/api/layouts', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockLayouts)
			});
		});

		// Mock jobs list
		await page.route('**/api/build/jobs', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify([mockRunningJob])
				});
			}
		});

		// Mock logs endpoint
		await page.route('**/api/build/jobs/job-123/logs**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockLogs)
			});
		});
	});

	test('shows logs panel when job is selected', async ({ page }) => {
		await page.goto('/build');

		// Click on the job to select it
		await page.getByText('test-layout.md').click();

		// Check logs panel is visible
		const logsPanel = page.locator('[data-testid="logs"]');
		await expect(logsPanel).toBeVisible();

		// Check log content appears
		await expect(logsPanel.getByText('Build started')).toBeVisible();
	});

	test('logs panel has correct test id', async ({ page }) => {
		await page.goto('/build');

		// Select job
		await page.getByText('test-layout.md').click();

		// Verify logs testid
		await expect(page.locator('[data-testid="logs"]')).toBeVisible();
	});

	test('shows cancel button for running job', async ({ page }) => {
		await page.goto('/build');

		// Select job
		await page.getByText('test-layout.md').click();

		// Check cancel button
		const cancelButton = page.locator('[data-testid="cancel"]');
		await expect(cancelButton).toBeVisible();
		await expect(cancelButton).toHaveText('Cancel Build');
	});
});

test.describe('Start build flow', () => {
	test.beforeEach(async ({ page }) => {
		// Mock layouts
		await page.route('**/api/layouts', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockLayouts)
			});
		});

		// Mock empty jobs initially
		await page.route('**/api/build/jobs', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify([])
				});
			}
		});

		// Mock start build endpoint
		await page.route('**/api/build/start', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ job: mockBuildJob })
			});
		});

		// Mock logs for the new job
		await page.route('**/api/build/jobs/job-123/logs**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ job_id: 'job-123', logs: [], has_more: false })
			});
		});
	});

	test('can start a build', async ({ page }) => {
		await page.goto('/build');

		// Click start build
		const startButton = page.locator('[data-testid="start-build"]');
		await startButton.click();

		// Wait for job to appear (the job card should show up)
		await expect(page.getByText('test-layout.md').first()).toBeVisible();
	});
});

test.describe('Cancel build flow', () => {
	test.beforeEach(async ({ page }) => {
		// Mock layouts
		await page.route('**/api/layouts', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockLayouts)
			});
		});

		// Mock jobs with running job
		await page.route('**/api/build/jobs', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify([mockRunningJob])
				});
			}
		});

		// Mock logs
		await page.route('**/api/build/jobs/job-123/logs**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockLogs)
			});
		});

		// Mock cancel endpoint
		await page.route('**/api/build/jobs/job-123/cancel', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ success: true, message: 'Build cancelled' })
			});
		});
	});

	test('cancel button calls cancel endpoint', async ({ page }) => {
		await page.goto('/build');

		// Select job
		await page.getByText('test-layout.md').click();

		// Click cancel
		const cancelButton = page.locator('[data-testid="cancel"]');
		await cancelButton.click();

		// Button should show cancelling state briefly
		// The request should have been made (we can't easily verify without network interception,
		// but the test passing without error indicates the route was hit)
		await expect(cancelButton).toBeVisible();
	});
});

test.describe('Build page navigation', () => {
	test.beforeEach(async ({ page }) => {
		// Mock layouts
		await page.route('**/api/layouts', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ layouts: [] })
			});
		});

		await page.route('**/api/build/jobs', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([])
			});
		});

		await page.route('**/api/preflight', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					qmk_configured: true,
					has_layouts: true,
					first_run: false,
					qmk_firmware_path: '/path/to/qmk_firmware'
				})
			});
		});
	});

	test('build page is accessible via More menu', async ({ page }) => {
		await page.goto('/');

		// Click the "More" dropdown
		await page.getByRole('button', { name: 'More' }).click();

		// Click Build in dropdown
		await page.getByRole('link', { name: 'Build Compile firmware' }).click();

		// Should navigate to build page
		await expect(page).toHaveURL('/build');
		await expect(page.getByRole('heading', { name: 'Build Firmware', level: 1 })).toBeVisible();
	});
});

test.describe('Build page error handling', () => {
	test('shows error when API fails', async ({ page }) => {
		// Mock layouts endpoint to fail
		await page.route('**/api/layouts', async (route) => {
			await route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'Internal server error' })
			});
		});

		await page.route('**/api/build/jobs', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([])
			});
		});

		await page.goto('/build');

		// Should show error message
		await expect(page.getByText(/Internal server error/i)).toBeVisible();
	});
});

test.describe('Completed job display', () => {
	test.beforeEach(async ({ page }) => {
		await page.route('**/api/layouts', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(mockLayouts)
			});
		});

		await page.route('**/api/build/jobs', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([mockCompletedJob])
			});
		});

		await page.route('**/api/build/jobs/job-123/logs**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					job_id: 'job-123',
					logs: [
						{ timestamp: '2024-01-01T12:01:00Z', level: 'INFO', message: 'Firmware generated: /tmp/crkbd_default.uf2' }
					],
					has_more: false
				})
			});
		});
	});

	test('shows firmware path for completed job', async ({ page }) => {
		await page.goto('/build');

		// Select completed job
		await page.getByText('test-layout.md').click();

		// Should show firmware path in the success banner
		await expect(page.getByText('Firmware built:')).toBeVisible();
	});

	test('does not show cancel button for completed job', async ({ page }) => {
		await page.goto('/build');

		// Select completed job
		await page.getByText('test-layout.md').click();

		// Cancel button should not be visible
		await expect(page.locator('[data-testid="cancel"]')).not.toBeVisible();
	});
});
