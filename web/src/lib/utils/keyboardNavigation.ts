/**
 * Keyboard navigation utilities for the keyboard preview.
 * 
 * Handles arrow key navigation, selection extension with Shift, and other shortcuts
 * while ensuring text inputs and other form elements are not affected.
 */

import type { KeySvgData } from './geometry';

/**
 * Checks if the current active element is a text input or contenteditable element.
 * Returns true if keyboard shortcuts should be suppressed.
 */
export function isTypingContext(): boolean {
	const activeElement = document.activeElement;
	
	if (!activeElement) {
		return false;
	}
	
	// Check for input elements
	if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
		return true;
	}
	
	// Check for select elements
	if (activeElement instanceof HTMLSelectElement) {
		return true;
	}
	
	// Check for contenteditable
	if (activeElement instanceof HTMLElement && activeElement.isContentEditable) {
		return true;
	}
	
	return false;
}

/**
 * Finds keys adjacent to the given key in visual space.
 * Uses a grid-based approach to find the nearest key in each direction.
 */
export function findAdjacentKey(
	currentKey: KeySvgData,
	keys: KeySvgData[],
	direction: 'up' | 'down' | 'left' | 'right'
): KeySvgData | null {
	if (keys.length === 0) {
		return null;
	}
	
	const currentCenterX = currentKey.x + currentKey.width / 2;
	const currentCenterY = currentKey.y + currentKey.height / 2;
	
	// Filter keys based on direction and find the closest one
	let candidates: Array<{ key: KeySvgData; distance: number }> = [];
	
	for (const key of keys) {
		if (key.visualIndex === currentKey.visualIndex) {
			continue; // Skip the current key
		}
		
		const keyCenterX = key.x + key.width / 2;
		const keyCenterY = key.y + key.height / 2;
		const deltaX = keyCenterX - currentCenterX;
		const deltaY = keyCenterY - currentCenterY;
		
		let isCandidate = false;
		let primaryDistance = 0;
		let secondaryDistance = 0;
		
		switch (direction) {
			case 'up':
				// Key must be above (negative deltaY) and within reasonable horizontal range
				if (deltaY < -5) {
					isCandidate = true;
					primaryDistance = Math.abs(deltaY);
					secondaryDistance = Math.abs(deltaX);
				}
				break;
			case 'down':
				// Key must be below (positive deltaY) and within reasonable horizontal range
				if (deltaY > 5) {
					isCandidate = true;
					primaryDistance = Math.abs(deltaY);
					secondaryDistance = Math.abs(deltaX);
				}
				break;
			case 'left':
				// Key must be to the left (negative deltaX) and within reasonable vertical range
				if (deltaX < -5) {
					isCandidate = true;
					primaryDistance = Math.abs(deltaX);
					secondaryDistance = Math.abs(deltaY);
				}
				break;
			case 'right':
				// Key must be to the right (positive deltaX) and within reasonable vertical range
				if (deltaX > 5) {
					isCandidate = true;
					primaryDistance = Math.abs(deltaX);
					secondaryDistance = Math.abs(deltaY);
				}
				break;
		}
		
		if (isCandidate) {
			// Combined distance: prioritize primary direction but consider secondary
			const combinedDistance = primaryDistance + secondaryDistance * 0.5;
			candidates.push({ key, distance: combinedDistance });
		}
	}
	
	// Sort by combined distance and return the closest
	if (candidates.length === 0) {
		return null;
	}
	
	candidates.sort((a, b) => a.distance - b.distance);
	return candidates[0].key;
}

/**
 * Handles keyboard navigation within the keyboard preview.
 * Returns the new selected key index, or null if no navigation occurred.
 */
export function handleKeyboardNavigation(
	event: KeyboardEvent,
	currentKeyIndex: number | null,
	keys: KeySvgData[],
	selectedIndices: Set<number>
): {
	newKeyIndex: number | null;
	newSelectedIndices: Set<number>;
	handled: boolean;
} {
	// Don't handle if in typing context
	if (isTypingContext()) {
		return { newKeyIndex: currentKeyIndex, newSelectedIndices: selectedIndices, handled: false };
	}
	
	const shiftKey = event.shiftKey;
	
	// Arrow key navigation
	if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
		// If no key is selected, select the first key
		if (currentKeyIndex === null && keys.length > 0) {
			return {
				newKeyIndex: keys[0].visualIndex,
				newSelectedIndices: new Set(),
				handled: true
			};
		}
		
		if (currentKeyIndex === null) {
			return { newKeyIndex: null, newSelectedIndices: selectedIndices, handled: false };
		}
		
		const currentKey = keys.find(k => k.visualIndex === currentKeyIndex);
		if (!currentKey) {
			return { newKeyIndex: currentKeyIndex, newSelectedIndices: selectedIndices, handled: false };
		}
		
		let direction: 'up' | 'down' | 'left' | 'right';
		switch (event.key) {
			case 'ArrowUp':
				direction = 'up';
				break;
			case 'ArrowDown':
				direction = 'down';
				break;
			case 'ArrowLeft':
				direction = 'left';
				break;
			case 'ArrowRight':
				direction = 'right';
				break;
			default:
				return { newKeyIndex: currentKeyIndex, newSelectedIndices: selectedIndices, handled: false };
		}
		
		const adjacentKey = findAdjacentKey(currentKey, keys, direction);
		
		if (adjacentKey) {
			const newIndices = new Set(selectedIndices);
			
			if (shiftKey) {
				// Extend selection: add current key if not already selected, then add adjacent
				if (currentKeyIndex !== null && !newIndices.has(currentKeyIndex)) {
					newIndices.add(currentKeyIndex);
				}
				newIndices.add(adjacentKey.visualIndex);
			} else {
				// Clear selection on navigation without shift
				newIndices.clear();
			}
			
			return {
				newKeyIndex: adjacentKey.visualIndex,
				newSelectedIndices: newIndices,
				handled: true
			};
		}
		
		return { newKeyIndex: currentKeyIndex, newSelectedIndices: selectedIndices, handled: true };
	}
	
	return { newKeyIndex: currentKeyIndex, newSelectedIndices: selectedIndices, handled: false };
}

/**
 * Checks if a keydown event should cycle layers ([ or ])
 */
export function shouldCycleLayer(event: KeyboardEvent): 'prev' | 'next' | null {
	if (isTypingContext()) {
		return null;
	}
	
	// Don't cycle with modifiers (except Shift for [ and ])
	if (event.ctrlKey || event.metaKey || event.altKey) {
		return null;
	}
	
	if (event.key === '[') {
		return 'prev';
	}
	
	if (event.key === ']') {
		return 'next';
	}
	
	return null;
}

/**
 * Checks if the Escape key should clear selection or close picker
 */
export function shouldHandleEscape(event: KeyboardEvent): boolean {
	if (isTypingContext()) {
		return false;
	}
	
	return event.key === 'Escape';
}

/**
 * Checks if Enter should open the keycode picker
 */
export function shouldOpenPicker(event: KeyboardEvent): boolean {
	if (isTypingContext()) {
		return false;
	}
	
	return event.key === 'Enter';
}
