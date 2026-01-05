<script lang="ts">
	import { Button, Card, Input } from '$components';
	import type { Layer } from '$api/types';

	interface Props {
		layers: Layer[];
		selectedLayerIndex: number;
		onLayersChange: (layers: Layer[]) => void;
		onLayerSelect: (index: number) => void;
	}

	let { layers, selectedLayerIndex, onLayersChange, onLayerSelect }: Props = $props();

	let editingLayerIndex = $state<number | null>(null);
	let editingLayerName = $state('');

	function createNewLayer() {
		if (!layers.length) return;

		const keyCount = layers[0].keys.length;
		const newLayer: Layer = {
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

		onLayersChange([...layers, newLayer]);
	}

	function duplicateLayer(index: number) {
		const layerToDuplicate = layers[index];
		const newLayer: Layer = {
			...layerToDuplicate,
			name: `${layerToDuplicate.name} (Copy)`,
			number: layers.length,
			keys: layerToDuplicate.keys.map((k) => ({ ...k }))
		};

		onLayersChange([...layers, newLayer]);
	}

	function deleteLayer(index: number) {
		if (layers.length <= 1) {
			alert('Cannot delete the last layer');
			return;
		}

		const newLayers = layers.filter((_, i) => i !== index);
		// Update layer numbers
		newLayers.forEach((layer, i) => {
			layer.number = i;
		});

		onLayersChange(newLayers);

		// Update selected layer if needed
		if (selectedLayerIndex >= newLayers.length) {
			onLayerSelect(newLayers.length - 1);
		} else if (selectedLayerIndex === index) {
			onLayerSelect(Math.max(0, index - 1));
		}
	}

	function startRename(index: number) {
		editingLayerIndex = index;
		editingLayerName = layers[index].name;
	}

	function saveRename() {
		if (editingLayerIndex !== null && editingLayerName.trim()) {
			const newLayers = [...layers];
			newLayers[editingLayerIndex].name = editingLayerName.trim();
			onLayersChange(newLayers);
		}
		editingLayerIndex = null;
		editingLayerName = '';
	}

	function cancelRename() {
		editingLayerIndex = null;
		editingLayerName = '';
	}

	function moveLayerUp(index: number) {
		if (index === 0) return;

		const newLayers = [...layers];
		[newLayers[index - 1], newLayers[index]] = [newLayers[index], newLayers[index - 1]];

		// Update layer numbers
		newLayers.forEach((layer, i) => {
			layer.number = i;
		});

		onLayersChange(newLayers);

		// Update selected layer index
		if (selectedLayerIndex === index) {
			onLayerSelect(index - 1);
		} else if (selectedLayerIndex === index - 1) {
			onLayerSelect(index);
		}
	}

	function moveLayerDown(index: number) {
		if (index === layers.length - 1) return;

		const newLayers = [...layers];
		[newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];

		// Update layer numbers
		newLayers.forEach((layer, i) => {
			layer.number = i;
		});

		onLayersChange(newLayers);

		// Update selected layer index
		if (selectedLayerIndex === index) {
			onLayerSelect(index + 1);
		} else if (selectedLayerIndex === index + 1) {
			onLayerSelect(index);
		}
	}

	function copyLayerKeysTo(sourceIndex: number, targetIndex: number) {
		if (sourceIndex === targetIndex) return;

		const newLayers = [...layers];
		const sourceKeys = newLayers[sourceIndex].keys;

		newLayers[targetIndex].keys = sourceKeys.map((k) => ({ ...k }));

		onLayersChange(newLayers);
	}

	function swapLayers(index1: number, index2: number) {
		if (index1 === index2) return;

		const newLayers = [...layers];
		const temp = { ...newLayers[index1] };

		// Swap all properties except number
		const tempNumber1 = newLayers[index1].number;
		const tempNumber2 = newLayers[index2].number;

		newLayers[index1] = { ...newLayers[index2], number: tempNumber1 };
		newLayers[index2] = { ...temp, number: tempNumber2 };

		onLayersChange(newLayers);
	}

	let copySourceIndex = $state<number | null>(null);
	let swapSourceIndex = $state<number | null>(null);
</script>

<Card class="p-6">
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-lg font-semibold">Layer Manager</h2>
		<Button onclick={createNewLayer} size="sm">New Layer</Button>
	</div>

	<div class="space-y-3">
		{#each layers as layer, i}
			<div
				class="border border-border rounded-lg p-4 transition-colors {selectedLayerIndex === i
					? 'bg-primary/5 border-primary'
					: 'bg-background'}"
			>
				<div class="flex items-center justify-between mb-3">
					<div class="flex items-center gap-3 flex-1">
						<button
							onclick={() => onLayerSelect(i)}
							class="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors text-sm {selectedLayerIndex ===
							i
								? 'bg-primary text-primary-foreground border-primary'
								: 'bg-background hover:bg-accent border-border'}"
						>
							<span class="w-2.5 h-2.5 rounded-full" style="background-color: {layer.color}"></span>
							<span class="font-medium">Layer {i}</span>
						</button>

						{#if editingLayerIndex === i}
							<div class="flex items-center gap-2 flex-1 max-w-xs">
								<Input
									value={editingLayerName}
									oninput={(e) => (editingLayerName = e.currentTarget.value)}
									placeholder="Layer name"
									class="text-sm"
								/>
								<Button onclick={saveRename} size="sm">Save</Button>
								<Button onclick={cancelRename} size="sm" variant="ghost">Cancel</Button>
							</div>
						{:else}
							<div class="flex items-center gap-2">
								<span class="font-medium">{layer.name}</span>
								<button
									onclick={() => startRename(i)}
									class="text-sm text-muted-foreground hover:text-foreground"
									title="Rename"
								>
									✏️
								</button>
							</div>
						{/if}
					</div>

					<div class="flex items-center gap-2">
						<span class="text-xs text-muted-foreground">{layer.keys.length} keys</span>
					</div>
				</div>

				<div class="flex flex-wrap gap-2">
					<!-- Reorder buttons -->
					<Button
						onclick={() => moveLayerUp(i)}
						size="sm"
						variant="outline"
						disabled={i === 0}
						title="Move up"
					>
						↑
					</Button>
					<Button
						onclick={() => moveLayerDown(i)}
						size="sm"
						variant="outline"
						disabled={i === layers.length - 1}
						title="Move down"
					>
						↓
					</Button>

					<!-- Duplicate button -->
					<Button onclick={() => duplicateLayer(i)} size="sm" variant="outline" title="Duplicate layer">
						📋 Duplicate
					</Button>

					<!-- Copy keys buttons -->
					{#if copySourceIndex === null}
						<Button
							onclick={() => (copySourceIndex = i)}
							size="sm"
							variant="outline"
							title="Copy keys from this layer"
						>
							📑 Copy Keys
						</Button>
					{:else if copySourceIndex !== i}
						<Button
							onclick={() => {
								if (copySourceIndex !== null) {
									copyLayerKeysTo(copySourceIndex, i);
									copySourceIndex = null;
								}
							}}
							size="sm"
							variant="secondary"
							title="Paste keys to this layer"
						>
							📋 Paste Here
						</Button>
					{:else}
						<Button
							onclick={() => (copySourceIndex = null)}
							size="sm"
							variant="ghost"
							title="Cancel copy"
						>
							❌ Cancel Copy
						</Button>
					{/if}

					<!-- Swap buttons -->
					{#if swapSourceIndex === null}
						<Button
							onclick={() => (swapSourceIndex = i)}
							size="sm"
							variant="outline"
							title="Swap with another layer"
						>
							🔄 Swap
						</Button>
					{:else if swapSourceIndex !== i}
						<Button
							onclick={() => {
								if (swapSourceIndex !== null) {
									swapLayers(swapSourceIndex, i);
									swapSourceIndex = null;
								}
							}}
							size="sm"
							variant="secondary"
							title="Swap with this layer"
						>
							🔄 Swap Here
						</Button>
					{:else}
						<Button
							onclick={() => (swapSourceIndex = null)}
							size="sm"
							variant="ghost"
							title="Cancel swap"
						>
							❌ Cancel Swap
						</Button>
					{/if}

					<!-- Delete button -->
					<Button
						onclick={() => deleteLayer(i)}
						size="sm"
						variant="destructive"
						disabled={layers.length <= 1}
						title="Delete layer"
					>
						🗑️ Delete
					</Button>
				</div>
			</div>
		{/each}
	</div>

	{#if copySourceIndex !== null}
		<div class="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
			<p class="text-blue-500">
				Select target layer to paste keys from <strong>{layers[copySourceIndex].name}</strong>
			</p>
		</div>
	{/if}

	{#if swapSourceIndex !== null}
		<div class="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-sm">
			<p class="text-purple-500">
				Select target layer to swap with <strong>{layers[swapSourceIndex].name}</strong>
			</p>
		</div>
	{/if}
</Card>
