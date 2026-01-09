/**
 * Metadata validation utilities for layout metadata
 */

export interface ValidationError {
	field: string;
	message: string;
}

/**
 * Validates a layout name
 * Rules: non-empty, max 100 UTF-8 bytes
 */
export function validateName(name: string): ValidationError | null {
	if (!name || name.trim().length === 0) {
		return { field: 'name', message: 'Name cannot be empty' };
	}
	// Use UTF-8 byte length to match backend validation
	const byteLength = new TextEncoder().encode(name).length;
	if (byteLength > 100) {
		return { field: 'name', message: `Name exceeds maximum length of 100 bytes (got ${byteLength})` };
	}
	return null;
}

/**
 * Validates a single tag
 * Rules: lowercase ASCII letters, digits, and hyphens only (^[a-z0-9-]+$)
 * Non-ASCII characters (e.g., café, ñ) are rejected
 */
export function validateTag(tag: string): boolean {
	return /^[a-z0-9-]+$/.test(tag);
}

/**
 * Parses and validates a comma-separated tag string
 * - Splits by commas
 * - Trims whitespace
 * - Removes empty tags
 * - Validates each tag against ^[a-z0-9-]+$
 * - Removes duplicates (preserves first occurrence order)
 * 
 * Returns: { valid: true, tags: string[] } or { valid: false, error: string }
 */
export function parseAndValidateTags(tagsInput: string): 
	| { valid: true; tags: string[] }
	| { valid: false; error: string } {
	
	// Split by comma, trim, filter empty
	const rawTags = tagsInput
		.split(',')
		.map(tag => tag.trim())
		.filter(tag => tag.length > 0);
	
	// Remove duplicates (keep first occurrence)
	const uniqueTags = Array.from(new Set(rawTags));
	
	// Validate each tag
	for (const tag of uniqueTags) {
		if (!validateTag(tag)) {
			return {
				valid: false,
				error: `Invalid tag "${tag}": must be lowercase ASCII letters, digits, and hyphens only (no accents or special characters)`
			};
		}
	}
	
	return { valid: true, tags: uniqueTags };
}

/**
 * Validates all metadata fields
 */
export function validateMetadata(
	name: string,
	tagsInput: string
): { valid: boolean; errors: ValidationError[] } {
	const errors: ValidationError[] = [];
	
	// Validate name
	const nameError = validateName(name);
	if (nameError) {
		errors.push(nameError);
	}
	
	// Validate tags
	const tagsResult = parseAndValidateTags(tagsInput);
	if (!tagsResult.valid) {
		errors.push({ field: 'tags', message: tagsResult.error });
	}
	
	return {
		valid: errors.length === 0,
		errors
	};
}
