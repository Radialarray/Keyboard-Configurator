import { describe, it, expect, beforeEach } from 'vitest';
import { ClipboardManager } from './clipboard';
import type { KeyAssignment } from '$api/types';

describe('ClipboardManager', () => {
	let clipboard: ClipboardManager;
	let mockKeys: KeyAssignment[];

	beforeEach(() => {
		clipboard = new ClipboardManager();
		mockKeys = [
			{
				keycode: 'KC_A',
				matrix_position: [0, 0],
				visual_index: 0,
				led_index: 0,
				color_override: { r: 255, g: 0, b: 0 },
				category_id: 'cat1'
			},
			{
				keycode: 'KC_B',
				matrix_position: [0, 1],
				visual_index: 1,
				led_index: 1
			},
			{
				keycode: 'KC_C',
				matrix_position: [0, 2],
				visual_index: 2,
				led_index: 2,
				category_id: 'cat2'
			},
			{
				keycode: 'KC_D',
				matrix_position: [0, 3],
				visual_index: 3,
				led_index: 3
			}
		];
	});

	describe('copyKeys', () => {
		it('should copy selected keys to clipboard', () => {
			const selected = new Set([0, 2]);
			const count = clipboard.copyKeys(mockKeys, selected);

			expect(count).toBe(2);
			expect(clipboard.hasClipboardData()).toBe(true);
			expect(clipboard.getClipboardSize()).toBe(2);
		});

		it('should preserve color overrides and category IDs', () => {
			const selected = new Set([0]);
			clipboard.copyKeys(mockKeys, selected);

			// Test by pasting
			const result = clipboard.pasteKeys(mockKeys, new Set([1]), 0);
			expect(result).not.toBeNull();
			expect(result![1].color_override).toEqual({ r: 255, g: 0, b: 0 });
			expect(result![1].category_id).toBe('cat1');
		});

		it('should handle empty selection', () => {
			const count = clipboard.copyKeys(mockKeys, new Set());
			expect(count).toBe(0);
			expect(clipboard.hasClipboardData()).toBe(false);
		});

		it('should clear previous clipboard data', () => {
			clipboard.copyKeys(mockKeys, new Set([0]));
			expect(clipboard.getClipboardSize()).toBe(1);

			clipboard.copyKeys(mockKeys, new Set([1, 2]));
			expect(clipboard.getClipboardSize()).toBe(2);
		});
	});

	describe('cutKeys', () => {
		it('should copy keys and set them to KC_TRNS', () => {
			const selected = new Set([0, 2]);
			const result = clipboard.cutKeys(mockKeys, selected, 0);

			expect(clipboard.hasClipboardData()).toBe(true);
			expect(result[0].keycode).toBe('KC_TRNS');
			expect(result[2].keycode).toBe('KC_TRNS');
			expect(result[1].keycode).toBe('KC_B'); // Unchanged
		});

		it('should preserve original data in clipboard', () => {
			const selected = new Set([0]);
			clipboard.cutKeys(mockKeys, selected, 0);

			// Paste to verify clipboard has original data
			const result = clipboard.pasteKeys(mockKeys, new Set([1]), 0);
			expect(result![1].keycode).toBe('KC_A');
		});

		it('should enable undo', () => {
			const selected = new Set([0]);
			clipboard.cutKeys(mockKeys, selected, 0);

			expect(clipboard.canUndo(0)).toBe(true);
		});
	});

	describe('pasteKeys', () => {
		it('should paste to single target sequentially', () => {
			clipboard.copyKeys(mockKeys, new Set([0, 1])); // Copy KC_A, KC_B
			const result = clipboard.pasteKeys(mockKeys, new Set([2]), 0);

			expect(result).not.toBeNull();
			expect(result![2].keycode).toBe('KC_A');
			expect(result![3].keycode).toBe('KC_B');
		});

		it('should paste to multiple targets cyclically', () => {
			clipboard.copyKeys(mockKeys, new Set([0])); // Copy KC_A
			const result = clipboard.pasteKeys(mockKeys, new Set([1, 2, 3]), 0);

			expect(result).not.toBeNull();
			expect(result![1].keycode).toBe('KC_A');
			expect(result![2].keycode).toBe('KC_A');
			expect(result![3].keycode).toBe('KC_A');
		});

		it('should return null when clipboard is empty', () => {
			const result = clipboard.pasteKeys(mockKeys, new Set([0]), 0);
			expect(result).toBeNull();
		});

		it('should return null when no targets selected', () => {
			clipboard.copyKeys(mockKeys, new Set([0]));
			const result = clipboard.pasteKeys(mockKeys, new Set(), 0);
			expect(result).toBeNull();
		});

		it('should preserve existing keys not in paste target', () => {
			clipboard.copyKeys(mockKeys, new Set([0]));
			const result = clipboard.pasteKeys(mockKeys, new Set([2]), 0);

			expect(result![0].keycode).toBe('KC_A'); // Unchanged
			expect(result![1].keycode).toBe('KC_B'); // Unchanged
		});

		it('should enable undo after paste', () => {
			clipboard.copyKeys(mockKeys, new Set([0]));
			clipboard.pasteKeys(mockKeys, new Set([1]), 0);

			expect(clipboard.canUndo(0)).toBe(true);
		});
	});

	describe('undo', () => {
		it('should undo paste operation', () => {
			clipboard.copyKeys(mockKeys, new Set([0]));
			const afterPaste = clipboard.pasteKeys(mockKeys, new Set([1]), 0)!;
			expect(afterPaste[1].keycode).toBe('KC_A');

			const afterUndo = clipboard.undo(afterPaste, 0);
			expect(afterUndo).not.toBeNull();
			expect(afterUndo![1].keycode).toBe('KC_B'); // Restored
		});

		it('should undo cut operation', () => {
			const afterCut = clipboard.cutKeys(mockKeys, new Set([0]), 0);
			expect(afterCut[0].keycode).toBe('KC_TRNS');

			const afterUndo = clipboard.undo(afterCut, 0);
			expect(afterUndo).not.toBeNull();
			expect(afterUndo![0].keycode).toBe('KC_A'); // Restored
			expect(afterUndo![0].color_override).toEqual({ r: 255, g: 0, b: 0 });
		});

		it('should return null when no undo available', () => {
			const result = clipboard.undo(mockKeys, 0);
			expect(result).toBeNull();
		});

		it('should only undo on same layer', () => {
			clipboard.cutKeys(mockKeys, new Set([0]), 0);
			const result = clipboard.undo(mockKeys, 1); // Different layer

			expect(result).toBeNull();
			expect(clipboard.canUndo(0)).toBe(true); // Still available for layer 0
		});

		it('should handle multiple undos', () => {
			// First operation
			clipboard.copyKeys(mockKeys, new Set([0]));
			const afterPaste1 = clipboard.pasteKeys(mockKeys, new Set([1]), 0)!;
			
			// Second operation
			clipboard.copyKeys(afterPaste1, new Set([2]));
			const afterPaste2 = clipboard.pasteKeys(afterPaste1, new Set([3]), 0)!;

			// Undo second operation
			const afterUndo1 = clipboard.undo(afterPaste2, 0)!;
			expect(afterUndo1[3].keycode).toBe('KC_D'); // Restored

			// Undo first operation
			const afterUndo2 = clipboard.undo(afterUndo1, 0)!;
			expect(afterUndo2[1].keycode).toBe('KC_B'); // Restored
		});
	});

	describe('clipboard management', () => {
		it('should clear clipboard', () => {
			clipboard.copyKeys(mockKeys, new Set([0]));
			expect(clipboard.hasClipboardData()).toBe(true);

			clipboard.clearClipboard();
			expect(clipboard.hasClipboardData()).toBe(false);
		});

		it('should clear undo stack', () => {
			clipboard.cutKeys(mockKeys, new Set([0]), 0);
			expect(clipboard.canUndo(0)).toBe(true);

			clipboard.clearUndo();
			expect(clipboard.canUndo(0)).toBe(false);
		});
	});

	describe('integration scenarios', () => {
		it('should support copy-paste-undo workflow', () => {
			// Copy KC_A
			clipboard.copyKeys(mockKeys, new Set([0]));
			
			// Paste to index 2
			const afterPaste = clipboard.pasteKeys(mockKeys, new Set([2]), 0)!;
			expect(afterPaste[2].keycode).toBe('KC_A');
			
			// Undo
			const afterUndo = clipboard.undo(afterPaste, 0)!;
			expect(afterUndo[2].keycode).toBe('KC_C');
		});

		it('should support cut-paste-undo workflow', () => {
			// Cut KC_A and KC_B
			const afterCut = clipboard.cutKeys(mockKeys, new Set([0, 1]), 0);
			expect(afterCut[0].keycode).toBe('KC_TRNS');
			expect(afterCut[1].keycode).toBe('KC_TRNS');
			
			// Paste to index 2, 3
			const afterPaste = clipboard.pasteKeys(afterCut, new Set([2, 3]), 0)!;
			expect(afterPaste[2].keycode).toBe('KC_A');
			expect(afterPaste[3].keycode).toBe('KC_B');
			
			// Undo paste
			const afterUndo1 = clipboard.undo(afterPaste, 0)!;
			expect(afterUndo1[2].keycode).toBe('KC_C');
			expect(afterUndo1[3].keycode).toBe('KC_D');
			
			// Undo cut
			const afterUndo2 = clipboard.undo(afterUndo1, 0)!;
			expect(afterUndo2[0].keycode).toBe('KC_A');
			expect(afterUndo2[1].keycode).toBe('KC_B');
		});
	});
});
