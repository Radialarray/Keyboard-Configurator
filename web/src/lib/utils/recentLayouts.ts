/**
 * Recent Layouts Manager
 * 
 * Tracks recently opened layouts in localStorage for quick access from the home page.
 * Handles missing/deleted layouts gracefully by validating against the backend.
 */

export interface RecentLayout {
	filename: string;
	name: string;
	lastOpened: string; // ISO timestamp
}

const STORAGE_KEY = 'lazyqmk_recent_layouts';
const MAX_RECENT_LAYOUTS = 5;

/**
 * Get all recent layouts from localStorage
 */
export function getRecentLayouts(): RecentLayout[] {
	if (typeof localStorage === 'undefined') {
		return [];
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) {
			return [];
		}

		const parsed = JSON.parse(stored);
		if (!Array.isArray(parsed)) {
			return [];
		}

		// Validate structure
		return parsed.filter(
			(item): item is RecentLayout =>
				typeof item === 'object' &&
				item !== null &&
				typeof item.filename === 'string' &&
				typeof item.name === 'string' &&
				typeof item.lastOpened === 'string'
		);
	} catch (e) {
		console.warn('Failed to parse recent layouts from localStorage:', e);
		return [];
	}
}

/**
 * Add or update a layout in recent layouts
 */
export function addRecentLayout(filename: string, name: string): void {
	if (typeof localStorage === 'undefined') {
		return;
	}

	const recent = getRecentLayouts();
	const now = new Date().toISOString();

	// Remove existing entry if present
	const filtered = recent.filter((item) => item.filename !== filename);

	// Add new entry at the front
	const updated: RecentLayout[] = [
		{ filename, name, lastOpened: now },
		...filtered
	].slice(0, MAX_RECENT_LAYOUTS);

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
	} catch (e) {
		console.warn('Failed to save recent layouts to localStorage:', e);
	}
}

/**
 * Remove a layout from recent layouts
 */
export function removeRecentLayout(filename: string): void {
	if (typeof localStorage === 'undefined') {
		return;
	}

	const recent = getRecentLayouts();
	const filtered = recent.filter((item) => item.filename !== filename);

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
	} catch (e) {
		console.warn('Failed to update recent layouts in localStorage:', e);
	}
}

/**
 * Clear all recent layouts
 */
export function clearRecentLayouts(): void {
	if (typeof localStorage === 'undefined') {
		return;
	}

	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch (e) {
		console.warn('Failed to clear recent layouts from localStorage:', e);
	}
}

/**
 * Filter recent layouts against a list of valid layout filenames
 * Returns only recent layouts that still exist on the backend
 */
export function filterValidRecentLayouts(
	recentLayouts: RecentLayout[],
	validFilenames: Set<string>
): RecentLayout[] {
	return recentLayouts.filter((item) => validFilenames.has(item.filename));
}
