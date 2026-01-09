import { describe, it, expect } from 'vitest';
import {
	validateName,
	validateTag,
	parseAndValidateTags,
	validateMetadata
} from './metadata';

describe('validateName', () => {
	it('accepts valid names', () => {
		expect(validateName('My Layout')).toBeNull();
		expect(validateName('Test 123')).toBeNull();
		expect(validateName('a')).toBeNull();
	});

	it('rejects empty names', () => {
		expect(validateName('')).toEqual({
			field: 'name',
			message: 'Name cannot be empty'
		});
		expect(validateName('   ')).toEqual({
			field: 'name',
			message: 'Name cannot be empty'
		});
	});

	it('rejects names over 100 bytes (UTF-8)', () => {
		// ASCII: 101 chars = 101 bytes
		const longName = 'a'.repeat(101);
		const error = validateName(longName);
		expect(error).not.toBeNull();
		expect(error?.field).toBe('name');
		expect(error?.message).toContain('exceeds maximum');
		expect(error?.message).toContain('101');
	});

	it('accepts names with exactly 100 bytes (UTF-8)', () => {
		// ASCII: 100 chars = 100 bytes
		const exactlyHundred = 'a'.repeat(100);
		expect(validateName(exactlyHundred)).toBeNull();
	});

	it('rejects multi-byte characters exceeding 100 bytes', () => {
		// "café" = 5 bytes (c=1, a=1, f=1, é=2 bytes in UTF-8)
		// "café " = 6 bytes (including space)
		// Repeat 17 times = 102 bytes (exceeds 100)
		const multiByte = 'café '.repeat(17); // 102 bytes
		const error = validateName(multiByte);
		expect(error).not.toBeNull();
		expect(error?.field).toBe('name');
		expect(error?.message).toContain('exceeds maximum');
	});

	it('accepts multi-byte characters under 100 bytes', () => {
		// "café " = 6 bytes, repeat 16 times = 96 bytes
		const multiByte = 'café '.repeat(16); // 96 bytes
		expect(validateName(multiByte)).toBeNull();
	});
});

describe('validateTag', () => {
	it('accepts valid tags', () => {
		expect(validateTag('corne')).toBe(true);
		expect(validateTag('42-key')).toBe(true);
		expect(validateTag('minimal')).toBe(true);
		expect(validateTag('a')).toBe(true);
		expect(validateTag('123')).toBe(true);
		expect(validateTag('test-tag-123')).toBe(true);
	});

	it('rejects invalid tags', () => {
		expect(validateTag('UPPERCASE')).toBe(false);
		expect(validateTag('has space')).toBe(false);
		expect(validateTag('has_underscore')).toBe(false);
		expect(validateTag('special!')).toBe(false);
		expect(validateTag('dots.here')).toBe(false);
		expect(validateTag('')).toBe(false);
		// Non-ASCII characters
		expect(validateTag('café')).toBe(false); // é is non-ASCII
		expect(validateTag('niño')).toBe(false); // ñ is non-ASCII
		expect(validateTag('naïve')).toBe(false); // ï is non-ASCII
	});
});

describe('parseAndValidateTags', () => {
	it('parses valid comma-separated tags', () => {
		const result = parseAndValidateTags('corne,42-key,minimal');
		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.tags).toEqual(['corne', '42-key', 'minimal']);
		}
	});

	it('trims whitespace around tags', () => {
		const result = parseAndValidateTags('  corne  ,  42-key  ,  minimal  ');
		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.tags).toEqual(['corne', '42-key', 'minimal']);
		}
	});

	it('removes empty tags', () => {
		const result = parseAndValidateTags('corne,,42-key,  ,minimal');
		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.tags).toEqual(['corne', '42-key', 'minimal']);
		}
	});

	it('removes duplicate tags', () => {
		const result = parseAndValidateTags('corne,42-key,corne,minimal,42-key');
		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.tags).toEqual(['corne', '42-key', 'minimal']);
		}
	});

	it('preserves order when removing duplicates', () => {
		const result = parseAndValidateTags('zebra,apple,banana,apple,zebra');
		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.tags).toEqual(['zebra', 'apple', 'banana']);
		}
	});

	it('rejects invalid tags', () => {
		const result = parseAndValidateTags('corne,INVALID,minimal');
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toContain('INVALID');
			expect(result.error).toContain('lowercase ASCII');
		}
	});

	it('rejects non-ASCII tags with clear message', () => {
		const result = parseAndValidateTags('valid,café,another');
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toContain('café');
			expect(result.error).toContain('lowercase ASCII');
			expect(result.error).toContain('no accents');
		}
	});

	it('handles empty input', () => {
		const result = parseAndValidateTags('');
		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.tags).toEqual([]);
		}
	});

	it('handles whitespace-only input', () => {
		const result = parseAndValidateTags('   ,  ,  ');
		expect(result.valid).toBe(true);
		if (result.valid) {
			expect(result.tags).toEqual([]);
		}
	});

	it('rejects tags with underscores', () => {
		const result = parseAndValidateTags('valid-tag,has_underscore');
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toContain('has_underscore');
		}
	});

	it('rejects tags with spaces', () => {
		const result = parseAndValidateTags('valid-tag,has space');
		expect(result.valid).toBe(false);
		if (!result.valid) {
			expect(result.error).toContain('has space');
		}
	});
});

describe('validateMetadata', () => {
	it('accepts valid metadata', () => {
		const result = validateMetadata('My Layout', 'corne,42-key,minimal');
		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it('collects multiple errors', () => {
		const result = validateMetadata('', 'INVALID,bad tag');
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThanOrEqual(1);
		const fields = result.errors.map(e => e.field);
		expect(fields).toContain('name');
	});

	it('validates name and tags independently', () => {
		// Valid name, invalid tags
		const result1 = validateMetadata('Valid Name', 'INVALID');
		expect(result1.valid).toBe(false);
		expect(result1.errors.some(e => e.field === 'tags')).toBe(true);

		// Invalid name, valid tags
		const result2 = validateMetadata('', 'valid-tag');
		expect(result2.valid).toBe(false);
		expect(result2.errors.some(e => e.field === 'name')).toBe(true);
	});

	it('accepts empty tags', () => {
		const result = validateMetadata('Valid Name', '');
		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
	});
});
