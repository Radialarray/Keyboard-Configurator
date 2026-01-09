/**
 * Clipboard operations for key assignments.
 * Handles copy, cut, paste, and undo for multi-key selection.
 */

import type { KeyAssignment, RgbColor } from '$api/types';

/**
 * Represents a key's copyable state
 */
export interface ClipboardKeyData {
	keycode: string;
	color_override?: RgbColor;
	category_id?: string;
}

/**
 * Operation types for undo
 */
export type ClipboardOperation = 
	| { type: 'paste'; layerIndex: number; changes: Map<number, KeyAssignment> }
	| { type: 'cut'; layerIndex: number; changes: Map<number, KeyAssignment> };

/**
 * Clipboard manager for key operations
 */
export class ClipboardManager {
	private clipboardData: Map<number, ClipboardKeyData> = new Map();
	private undoStack: ClipboardOperation[] = [];
	private maxUndoSize = 50;

	/**
	 * Copy selected keys to clipboard
	 */
	copyKeys(keys: KeyAssignment[], selectedIndices: Set<number>): number {
		this.clipboardData.clear();
		
		for (const key of keys) {
			if (selectedIndices.has(key.visual_index)) {
				this.clipboardData.set(key.visual_index, {
					keycode: key.keycode,
					color_override: key.color_override,
					category_id: key.category_id
				});
			}
		}
		
		return this.clipboardData.size;
	}

	/**
	 * Cut selected keys (copy + set to KC_TRNS)
	 */
	cutKeys(keys: KeyAssignment[], selectedIndices: Set<number>, layerIndex: number): KeyAssignment[] {
		// First, copy to clipboard
		this.copyKeys(keys, selectedIndices);

		// Save original state for undo
		const previousState = new Map<number, KeyAssignment>();
		for (const key of keys) {
			if (selectedIndices.has(key.visual_index)) {
				previousState.set(key.visual_index, { ...key });
			}
		}

		// Create new array with KC_TRNS for selected keys
		const updatedKeys = keys.map(key => {
			if (selectedIndices.has(key.visual_index)) {
				return { ...key, keycode: 'KC_TRNS' };
			}
			return key;
		});

		// Push to undo stack
		this.pushUndo({ type: 'cut', layerIndex, changes: previousState });

		return updatedKeys;
	}

	/**
	 * Paste clipboard data to selected keys or single anchor key
	 */
	pasteKeys(
		keys: KeyAssignment[], 
		selectedIndices: Set<number>, 
		layerIndex: number
	): KeyAssignment[] | null {
		if (this.clipboardData.size === 0) {
			return null;
		}

		// Save original state for undo
		const previousState = new Map<number, KeyAssignment>();
		
		// Determine paste targets
		const targetIndices = selectedIndices.size > 0 
			? Array.from(selectedIndices) 
			: [];

		if (targetIndices.length === 0) {
			return null;
		}

		// Get clipboard keys in order
		const clipboardKeys = Array.from(this.clipboardData.entries()).sort((a, b) => a[0] - b[0]);

		// Paste strategy:
		// - If single target: paste all clipboard keys starting from target
		// - If multiple targets: paste clipboard keys cycling through targets
		const updatedKeys = [...keys];
		
		if (targetIndices.length === 1) {
			// Single target: paste sequentially starting from target
			const startIdx = targetIndices[0];
			const visualIndices = keys.map(k => k.visual_index).sort((a, b) => a - b);
			const startPos = visualIndices.indexOf(startIdx);
			
			if (startPos >= 0) {
				clipboardKeys.forEach(([_, clipData], offset) => {
					const targetVisualIdx = visualIndices[startPos + offset];
					if (targetVisualIdx !== undefined) {
						const keyIdx = keys.findIndex(k => k.visual_index === targetVisualIdx);
						if (keyIdx >= 0) {
							previousState.set(targetVisualIdx, { ...keys[keyIdx] });
							updatedKeys[keyIdx] = {
								...keys[keyIdx],
								keycode: clipData.keycode,
								color_override: clipData.color_override,
								category_id: clipData.category_id
							};
						}
					}
				});
			}
		} else {
			// Multiple targets: distribute clipboard across targets
			targetIndices.forEach((visualIdx, i) => {
				const clipboardIndex = i % clipboardKeys.length;
				const [_, clipData] = clipboardKeys[clipboardIndex];
				const keyIdx = keys.findIndex(k => k.visual_index === visualIdx);
				
				if (keyIdx >= 0) {
					previousState.set(visualIdx, { ...keys[keyIdx] });
					updatedKeys[keyIdx] = {
						...keys[keyIdx],
						keycode: clipData.keycode,
						color_override: clipData.color_override,
						category_id: clipData.category_id
					};
				}
			});
		}

		// Push to undo stack if we made changes
		if (previousState.size > 0) {
			this.pushUndo({ type: 'paste', layerIndex, changes: previousState });
		}

		return updatedKeys;
	}

	/**
	 * Undo last clipboard operation
	 */
	undo(keys: KeyAssignment[], currentLayerIndex: number): KeyAssignment[] | null {
		const operation = this.undoStack.pop();
		if (!operation || operation.layerIndex !== currentLayerIndex) {
			// Can only undo on the same layer
			if (operation) {
				this.undoStack.push(operation); // Put it back
			}
			return null;
		}

		// Restore previous state
		const updatedKeys = [...keys];
		for (const [visualIndex, previousKey] of operation.changes) {
			const keyIdx = keys.findIndex(k => k.visual_index === visualIndex);
			if (keyIdx >= 0) {
				updatedKeys[keyIdx] = { ...previousKey };
			}
		}

		return updatedKeys;
	}

	/**
	 * Check if clipboard has data
	 */
	hasClipboardData(): boolean {
		return this.clipboardData.size > 0;
	}

	/**
	 * Check if undo is available for current layer
	 */
	canUndo(currentLayerIndex: number): boolean {
		if (this.undoStack.length === 0) {
			return false;
		}
		const lastOp = this.undoStack[this.undoStack.length - 1];
		return lastOp.layerIndex === currentLayerIndex;
	}

	/**
	 * Get clipboard size
	 */
	getClipboardSize(): number {
		return this.clipboardData.size;
	}

	/**
	 * Clear clipboard
	 */
	clearClipboard(): void {
		this.clipboardData.clear();
	}

	/**
	 * Clear undo stack
	 */
	clearUndo(): void {
		this.undoStack = [];
	}

	/**
	 * Push operation to undo stack
	 */
	private pushUndo(operation: ClipboardOperation): void {
		this.undoStack.push(operation);
		if (this.undoStack.length > this.maxUndoSize) {
			this.undoStack.shift();
		}
	}
}
