import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient } from './client';

describe('ApiClient - Template Operations', () => {
	let client: ApiClient;
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockFetch = vi.fn();
		global.fetch = mockFetch;
		client = new ApiClient('http://test');
	});

	describe('listTemplates', () => {
		it('should fetch templates list', async () => {
			const mockResponse = {
				templates: [
					{
						filename: 'test-template.md',
						name: 'Test Template',
						description: 'A test template',
						author: 'Test User',
						tags: ['test', 'example'],
						created: '2024-01-01T00:00:00Z',
						layer_count: 3
					}
				]
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const result = await client.listTemplates();

			expect(mockFetch).toHaveBeenCalledWith('http://test/api/templates', {
				headers: { 'Content-Type': 'application/json' }
			});
			expect(result).toEqual(mockResponse);
		});
	});

	describe('getTemplate', () => {
		it('should fetch a specific template', async () => {
			const mockTemplate = {
				metadata: {
					name: 'Test Template',
					is_template: true
				},
				layers: []
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockTemplate
			});

			const result = await client.getTemplate('test-template.md');

			expect(mockFetch).toHaveBeenCalledWith('http://test/api/templates/test-template.md', {
				headers: { 'Content-Type': 'application/json' }
			});
			expect(result).toEqual(mockTemplate);
		});
	});

	describe('saveAsTemplate', () => {
		it('should save layout as template', async () => {
			const mockResponse = {
				filename: 'my-template.md',
				name: 'My Template',
				description: 'Test',
				author: 'User',
				tags: ['test'],
				created: '2024-01-01T00:00:00Z',
				layer_count: 2
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse
			});

			const result = await client.saveAsTemplate('layout.md', {
				name: 'My Template',
				tags: ['test']
			});

			expect(mockFetch).toHaveBeenCalledWith(
				'http://test/api/layouts/layout.md/save-as-template',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: 'My Template', tags: ['test'] })
				}
			);
			expect(result).toEqual(mockResponse);
		});
	});

	describe('applyTemplate', () => {
		it('should apply template to create new layout', async () => {
			const mockLayout = {
				metadata: { name: 'New Layout', is_template: false },
				layers: []
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockLayout
			});

			const result = await client.applyTemplate('template.md', {
				target_filename: 'new-layout.md'
			});

			expect(mockFetch).toHaveBeenCalledWith('http://test/api/templates/template.md/apply', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ target_filename: 'new-layout.md' })
			});
			expect(result).toEqual(mockLayout);
		});
	});
});
