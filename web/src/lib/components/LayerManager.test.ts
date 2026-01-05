import { describe, it, expect } from 'vitest';
import type { Layer } from '$api/types';

// Helper functions that mirror LayerManager logic
function createNewLayer(layers: Layer[]): Layer {
	if (!layers.length) {
		throw new Error('Cannot create new layer without existing layers');
	}

	const keyCount = layers[0].keys.length;
	return {
		name: `Layer ${layers.length}`,
		number: layers.length,
		color: '#888888',
		keys: Array.from({ length: keyCount }, (_, i) => ({
			keycode: 'KC_TRNS',
			matrix_position: layers[0].keys[i].matrix_position,
			visual_index: i,
			led_index: layers[0].keys[i].led_index
		}))
	};
}

function duplicateLayer(layer: Layer, newNumber: number): Layer {
	return {
		...layer,
		name: `${layer.name} (Copy)`,
		number: newNumber,
		keys: layer.keys.map((k) => ({ ...k }))
	};
}

function canDeleteLayer(layers: Layer[]): boolean {
	return layers.length > 1;
}

function moveLayer(layers: Layer[], fromIndex: number, direction: 'up' | 'down'): Layer[] {
	const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
	if (toIndex < 0 || toIndex >= layers.length) {
		return layers;
	}

	const newLayers = [...layers];
	[newLayers[fromIndex], newLayers[toIndex]] = [newLayers[toIndex], newLayers[fromIndex]];

	// Update layer numbers
	newLayers.forEach((layer, i) => {
		layer.number = i;
	});

	return newLayers;
}

function copyLayerKeys(sourceLayer: Layer, targetLayer: Layer): Layer {
	return {
		...targetLayer,
		keys: sourceLayer.keys.map((k) => ({ ...k }))
	};
}

function swapLayerContents(layer1: Layer, layer2: Layer): [Layer, Layer] {
	const temp = { ...layer1 };
	const newLayer1 = { ...layer2, number: layer1.number };
	const newLayer2 = { ...temp, number: layer2.number };
	return [newLayer1, newLayer2];
}

describe('LayerManager Logic', () => {
	const createMockLayer = (name: string, number: number, keyCount = 3): Layer => ({
		name,
		number,
		color: '#888888',
		keys: Array.from({ length: keyCount }, (_, i) => ({
			keycode: 'KC_A',
			matrix_position: [0, i] as [number, number],
			visual_index: i,
			led_index: i
		}))
	});

	describe('createNewLayer', () => {
		it('creates new layer with transparent keys', () => {
			const existingLayers = [createMockLayer('Base', 0, 3)];
			const newLayer = createNewLayer(existingLayers);

			expect(newLayer.name).toBe('Layer 1');
			expect(newLayer.number).toBe(1);
			expect(newLayer.keys.length).toBe(3);
			expect(newLayer.keys[0].keycode).toBe('KC_TRNS');
		});

		it('matches key count of existing layer', () => {
			const existingLayers = [createMockLayer('Base', 0, 5)];
			const newLayer = createNewLayer(existingLayers);

			expect(newLayer.keys.length).toBe(5);
		});
	});

	describe('duplicateLayer', () => {
		it('duplicates layer with all keys', () => {
			const originalLayer = createMockLayer('Base', 0, 3);
			originalLayer.keys[0].keycode = 'KC_X';
			const duplicated = duplicateLayer(originalLayer, 1);

			expect(duplicated.name).toBe('Base (Copy)');
			expect(duplicated.number).toBe(1);
			expect(duplicated.keys.length).toBe(3);
			expect(duplicated.keys[0].keycode).toBe('KC_X');
		});

		it('creates independent key copies', () => {
			const originalLayer = createMockLayer('Base', 0, 2);
			const duplicated = duplicateLayer(originalLayer, 1);

			// Modify duplicated layer
			duplicated.keys[0].keycode = 'KC_B';

			// Original should be unchanged
			expect(originalLayer.keys[0].keycode).toBe('KC_A');
		});
	});

	describe('canDeleteLayer', () => {
		it('prevents deleting last layer', () => {
			const layers = [createMockLayer('Base', 0)];
			expect(canDeleteLayer(layers)).toBe(false);
		});

		it('allows deleting when multiple layers exist', () => {
			const layers = [createMockLayer('Base', 0), createMockLayer('Layer 1', 1)];
			expect(canDeleteLayer(layers)).toBe(true);
		});
	});

	describe('moveLayer', () => {
		it('moves layer up in the stack', () => {
			const layers = [
				createMockLayer('Base', 0),
				createMockLayer('Layer 1', 1),
				createMockLayer('Layer 2', 2)
			];

			const result = moveLayer(layers, 2, 'up');

			expect(result[1].name).toBe('Layer 2');
			expect(result[1].number).toBe(1);
			expect(result[2].name).toBe('Layer 1');
			expect(result[2].number).toBe(2);
		});

		it('moves layer down in the stack', () => {
			const layers = [
				createMockLayer('Base', 0),
				createMockLayer('Layer 1', 1),
				createMockLayer('Layer 2', 2)
			];

			const result = moveLayer(layers, 0, 'down');

			expect(result[0].name).toBe('Layer 1');
			expect(result[0].number).toBe(0);
			expect(result[1].name).toBe('Base');
			expect(result[1].number).toBe(1);
		});

		it('does not move layer up from index 0', () => {
			const layers = [createMockLayer('Base', 0), createMockLayer('Layer 1', 1)];
			const result = moveLayer(layers, 0, 'up');

			expect(result).toEqual(layers);
		});

		it('does not move layer down from last index', () => {
			const layers = [createMockLayer('Base', 0), createMockLayer('Layer 1', 1)];
			const result = moveLayer(layers, 1, 'down');

			expect(result).toEqual(layers);
		});
	});

	describe('copyLayerKeys', () => {
		it('copies keys from source to target', () => {
			const sourceLayer = createMockLayer('Source', 0, 2);
			sourceLayer.keys[0].keycode = 'KC_X';
			sourceLayer.keys[1].keycode = 'KC_Y';

			const targetLayer = createMockLayer('Target', 1, 2);

			const result = copyLayerKeys(sourceLayer, targetLayer);

			expect(result.name).toBe('Target');
			expect(result.number).toBe(1);
			expect(result.keys[0].keycode).toBe('KC_X');
			expect(result.keys[1].keycode).toBe('KC_Y');
		});

		it('creates independent key copies', () => {
			const sourceLayer = createMockLayer('Source', 0, 1);
			const targetLayer = createMockLayer('Target', 1, 1);

			const result = copyLayerKeys(sourceLayer, targetLayer);
			result.keys[0].keycode = 'KC_B';

			expect(sourceLayer.keys[0].keycode).toBe('KC_A');
		});
	});

	describe('swapLayerContents', () => {
		it('swaps all layer properties except numbers', () => {
			const layer1 = createMockLayer('Base', 0, 2);
			layer1.keys[0].keycode = 'KC_X';

			const layer2 = createMockLayer('Layer 1', 1, 2);
			layer2.keys[0].keycode = 'KC_Y';

			const [swapped1, swapped2] = swapLayerContents(layer1, layer2);

			expect(swapped1.name).toBe('Layer 1');
			expect(swapped1.number).toBe(0);
			expect(swapped1.keys[0].keycode).toBe('KC_Y');

			expect(swapped2.name).toBe('Base');
			expect(swapped2.number).toBe(1);
			expect(swapped2.keys[0].keycode).toBe('KC_X');
		});
	});
});
