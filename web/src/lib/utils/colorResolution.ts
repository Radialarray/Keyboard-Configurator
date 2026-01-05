import type { RgbColor, KeyAssignment, Layer, Category } from '$api/types';

/**
 * Resolves the final RGB color for a key based on priority:
 * 1. Key color override (highest priority)
 * 2. Key category color
 * 3. Layer category color
 * 4. Layer default color (lowest priority)
 *
 * @param key - The key assignment
 * @param layer - The layer containing the key
 * @param categories - Array of all categories
 * @returns The resolved RGB color as hex string (#RRGGBB), or undefined if no color
 */
export function resolveKeyColor(
	key: KeyAssignment,
	layer: Layer,
	categories: Category[]
): string | undefined {
	// 1. Key color override (highest priority)
	if (key.color_override) {
		return rgbToHex(key.color_override);
	}

	// 2. Key category color
	if (key.category_id) {
		const keyCategory = categories.find((c) => c.id === key.category_id);
		if (keyCategory) {
			return rgbToHex(keyCategory.color);
		}
	}

	// 3. Layer category color (only if layer colors enabled)
	if (layer.layer_colors_enabled !== false && layer.category_id) {
		const layerCategory = categories.find((c) => c.id === layer.category_id);
		if (layerCategory) {
			return rgbToHex(layerCategory.color);
		}
	}

	// 4. Layer default color (only if layer colors enabled)
	if (layer.layer_colors_enabled !== false && layer.default_color) {
		return rgbToHex(layer.default_color);
	}

	// No color found
	return undefined;
}

/**
 * Converts an RgbColor object to a hex string (#RRGGBB).
 */
export function rgbToHex(color: RgbColor): string {
	const r = color.r.toString(16).padStart(2, '0');
	const g = color.g.toString(16).padStart(2, '0');
	const b = color.b.toString(16).padStart(2, '0');
	return `#${r}${g}${b}`.toUpperCase();
}

/**
 * Converts a hex string (#RRGGBB or RRGGBB) to an RgbColor object.
 */
export function hexToRgb(hex: string): RgbColor {
	const cleaned = hex.replace('#', '');
	const r = parseInt(cleaned.substring(0, 2), 16);
	const g = parseInt(cleaned.substring(2, 4), 16);
	const b = parseInt(cleaned.substring(4, 6), 16);
	return { r, g, b };
}

/**
 * Validates a hex color string.
 */
export function isValidHex(hex: string): boolean {
	const cleaned = hex.replace('#', '');
	return /^[0-9A-Fa-f]{6}$/.test(cleaned);
}
