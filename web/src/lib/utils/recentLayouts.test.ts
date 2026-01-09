import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	getRecentLayouts,
	addRecentLayout,
	removeRecentLayout,
	clearRecentLayouts,
	filterValidRecentLayouts,
	type RecentLayout
} from './recentLayouts';

describe('recentLayouts', () => {
	// Mock localStorage
	let storage: Record<string, string> = {};

	beforeEach(() => {
		storage = {};
		global.localStorage = {
			getItem: vi.fn((key: string) => storage[key] || null),
			setItem: vi.fn((key: string, value: string) => {
				storage[key] = value;
			}),
			removeItem: vi.fn((key: string) => {
				delete storage[key];
			}),
			clear: vi.fn(() => {
				storage = {};
			}),
			length: 0,
			key: vi.fn(() => null)
		} as Storage;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('getRecentLayouts', () => {
		it('returns empty array when localStorage is empty', () => {
			expect(getRecentLayouts()).toEqual([]);
		});

		it('returns parsed layouts from localStorage', () => {
			const layouts: RecentLayout[] = [
				{ filename: 'layout1.md', name: 'Layout 1', lastOpened: '2026-01-08T10:00:00Z' },
				{ filename: 'layout2.md', name: 'Layout 2', lastOpened: '2026-01-08T09:00:00Z' }
			];
			storage['lazyqmk_recent_layouts'] = JSON.stringify(layouts);

			expect(getRecentLayouts()).toEqual(layouts);
		});

		it('returns empty array when localStorage contains invalid JSON', () => {
			storage['lazyqmk_recent_layouts'] = 'invalid json';
			expect(getRecentLayouts()).toEqual([]);
		});

		it('filters out invalid entries', () => {
			const mixed = [
				{ filename: 'valid.md', name: 'Valid', lastOpened: '2026-01-08T10:00:00Z' },
				{ filename: 'missing-name.md', lastOpened: '2026-01-08T09:00:00Z' }, // missing name
				'not an object', // not an object
				{ name: 'missing filename', lastOpened: '2026-01-08T08:00:00Z' } // missing filename
			];
			storage['lazyqmk_recent_layouts'] = JSON.stringify(mixed);

			const result = getRecentLayouts();
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				filename: 'valid.md',
				name: 'Valid',
				lastOpened: '2026-01-08T10:00:00Z'
			});
		});
	});

	describe('addRecentLayout', () => {
		it('adds a new layout to empty list', () => {
			addRecentLayout('new.md', 'New Layout');

			const result = getRecentLayouts();
			expect(result).toHaveLength(1);
			expect(result[0].filename).toBe('new.md');
			expect(result[0].name).toBe('New Layout');
			expect(new Date(result[0].lastOpened)).toBeInstanceOf(Date);
		});

		it('adds layout to the front of the list', () => {
			storage['lazyqmk_recent_layouts'] = JSON.stringify([
				{ filename: 'old.md', name: 'Old Layout', lastOpened: '2026-01-08T08:00:00Z' }
			]);

			addRecentLayout('new.md', 'New Layout');

			const result = getRecentLayouts();
			expect(result).toHaveLength(2);
			expect(result[0].filename).toBe('new.md');
			expect(result[1].filename).toBe('old.md');
		});

		it('updates existing layout and moves it to front', () => {
			storage['lazyqmk_recent_layouts'] = JSON.stringify([
				{ filename: 'layout1.md', name: 'Layout 1', lastOpened: '2026-01-08T10:00:00Z' },
				{ filename: 'layout2.md', name: 'Layout 2', lastOpened: '2026-01-08T09:00:00Z' },
				{ filename: 'layout3.md', name: 'Layout 3', lastOpened: '2026-01-08T08:00:00Z' }
			]);

			addRecentLayout('layout2.md', 'Layout 2 Updated');

			const result = getRecentLayouts();
			expect(result).toHaveLength(3);
			expect(result[0].filename).toBe('layout2.md');
			expect(result[0].name).toBe('Layout 2 Updated');
			expect(result[1].filename).toBe('layout1.md');
			expect(result[2].filename).toBe('layout3.md');
		});

		it('limits list to MAX_RECENT_LAYOUTS (5)', () => {
			// Add 6 layouts
			for (let i = 1; i <= 6; i++) {
				addRecentLayout(`layout${i}.md`, `Layout ${i}`);
			}

			const result = getRecentLayouts();
			expect(result).toHaveLength(5);
			expect(result[0].filename).toBe('layout6.md');
			expect(result[4].filename).toBe('layout2.md');
			// layout1.md should be dropped
			expect(result.find((l) => l.filename === 'layout1.md')).toBeUndefined();
		});
	});

	describe('removeRecentLayout', () => {
		it('removes a layout from the list', () => {
			storage['lazyqmk_recent_layouts'] = JSON.stringify([
				{ filename: 'layout1.md', name: 'Layout 1', lastOpened: '2026-01-08T10:00:00Z' },
				{ filename: 'layout2.md', name: 'Layout 2', lastOpened: '2026-01-08T09:00:00Z' }
			]);

			removeRecentLayout('layout1.md');

			const result = getRecentLayouts();
			expect(result).toHaveLength(1);
			expect(result[0].filename).toBe('layout2.md');
		});

		it('does nothing when layout not found', () => {
			storage['lazyqmk_recent_layouts'] = JSON.stringify([
				{ filename: 'layout1.md', name: 'Layout 1', lastOpened: '2026-01-08T10:00:00Z' }
			]);

			removeRecentLayout('nonexistent.md');

			const result = getRecentLayouts();
			expect(result).toHaveLength(1);
		});

		it('handles empty list', () => {
			removeRecentLayout('layout1.md');
			expect(getRecentLayouts()).toEqual([]);
		});
	});

	describe('clearRecentLayouts', () => {
		it('removes all recent layouts', () => {
			storage['lazyqmk_recent_layouts'] = JSON.stringify([
				{ filename: 'layout1.md', name: 'Layout 1', lastOpened: '2026-01-08T10:00:00Z' },
				{ filename: 'layout2.md', name: 'Layout 2', lastOpened: '2026-01-08T09:00:00Z' }
			]);

			clearRecentLayouts();

			expect(getRecentLayouts()).toEqual([]);
		});

		it('handles already empty list', () => {
			clearRecentLayouts();
			expect(getRecentLayouts()).toEqual([]);
		});
	});

	describe('filterValidRecentLayouts', () => {
		it('filters out layouts that no longer exist', () => {
			const recentLayouts: RecentLayout[] = [
				{ filename: 'valid1.md', name: 'Valid 1', lastOpened: '2026-01-08T10:00:00Z' },
				{ filename: 'deleted.md', name: 'Deleted', lastOpened: '2026-01-08T09:00:00Z' },
				{ filename: 'valid2.md', name: 'Valid 2', lastOpened: '2026-01-08T08:00:00Z' }
			];

			const validFilenames = new Set(['valid1.md', 'valid2.md', 'other.md']);

			const result = filterValidRecentLayouts(recentLayouts, validFilenames);

			expect(result).toHaveLength(2);
			expect(result[0].filename).toBe('valid1.md');
			expect(result[1].filename).toBe('valid2.md');
		});

		it('returns empty array when no layouts are valid', () => {
			const recentLayouts: RecentLayout[] = [
				{ filename: 'deleted1.md', name: 'Deleted 1', lastOpened: '2026-01-08T10:00:00Z' },
				{ filename: 'deleted2.md', name: 'Deleted 2', lastOpened: '2026-01-08T09:00:00Z' }
			];

			const validFilenames = new Set(['valid.md']);

			const result = filterValidRecentLayouts(recentLayouts, validFilenames);

			expect(result).toEqual([]);
		});

		it('returns all layouts when all are valid', () => {
			const recentLayouts: RecentLayout[] = [
				{ filename: 'valid1.md', name: 'Valid 1', lastOpened: '2026-01-08T10:00:00Z' },
				{ filename: 'valid2.md', name: 'Valid 2', lastOpened: '2026-01-08T09:00:00Z' }
			];

			const validFilenames = new Set(['valid1.md', 'valid2.md']);

			const result = filterValidRecentLayouts(recentLayouts, validFilenames);

			expect(result).toEqual(recentLayouts);
		});
	});
});
