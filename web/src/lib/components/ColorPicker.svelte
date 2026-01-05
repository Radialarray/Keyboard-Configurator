<script lang="ts">
	import { Button } from '$components';
	import { hexToRgb, isValidHex } from '$lib/utils/colorResolution';
	import type { RgbColor } from '$api/types';

	interface Props {
		color?: RgbColor;
		onSelect: (color: RgbColor) => void;
		onClear?: () => void;
		label?: string;
		showClear?: boolean;
	}

	let { color, onSelect, onClear, label = 'Color', showClear = false }: Props = $props();

	// Predefined color palette
	const colorPalette = [
		'#FF0000', // Red
		'#FF8800', // Orange
		'#FFFF00', // Yellow
		'#00FF00', // Green
		'#00FFFF', // Cyan
		'#0088FF', // Blue
		'#8800FF', // Purple
		'#FF00FF', // Magenta
		'#FFFFFF', // White
		'#CCCCCC', // Light Gray
		'#888888', // Gray
		'#444444' // Dark Gray
	];

	let customHex = $state('');
	let customError = $state('');

	// Convert current color to hex for display
	const currentHex = $derived(
		color ? `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`.toUpperCase() : ''
	);

	function handlePaletteClick(hex: string) {
		onSelect(hexToRgb(hex));
	}

	function handleCustomInput(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		customHex = input.value;
		customError = '';
	}

	function handleCustomSubmit() {
		if (!customHex) {
			customError = 'Please enter a hex color';
			return;
		}

		if (!isValidHex(customHex)) {
			customError = 'Invalid hex color format (use #RRGGBB or RRGGBB)';
			return;
		}

		onSelect(hexToRgb(customHex));
		customHex = '';
		customError = '';
	}

	function handleClear() {
		onClear?.();
	}
</script>

<div class="color-picker">
	<p class="block text-sm font-medium text-muted-foreground mb-2">{label}</p>

	{#if currentHex}
		<div class="mb-3 flex items-center gap-2">
			<span class="text-sm text-muted-foreground">Current:</span>
			<div class="w-8 h-8 rounded border border-border" style="background-color: {currentHex}"></div>
			<code class="text-xs font-mono bg-muted px-2 py-1 rounded">{currentHex}</code>
		</div>
	{/if}

	<!-- Predefined palette -->
	<div class="mb-4">
		<p class="text-xs text-muted-foreground mb-2">Preset colors:</p>
		<div class="grid grid-cols-6 gap-2">
			{#each colorPalette as paletteColor}
				<button
					type="button"
					onclick={() => handlePaletteClick(paletteColor)}
					class="w-10 h-10 rounded border border-border hover:border-primary transition-colors cursor-pointer"
					style="background-color: {paletteColor}"
					title={paletteColor}
					aria-label="Select color {paletteColor}"
				></button>
			{/each}
		</div>
	</div>

	<!-- Custom hex input -->
	<div class="mb-3">
		<p class="text-xs text-muted-foreground mb-2">Custom hex color:</p>
		<div class="flex items-center gap-2">
			<input
				type="text"
				value={customHex}
				oninput={handleCustomInput}
				placeholder="#FF0000"
				class="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm font-mono"
			/>
			<Button onclick={handleCustomSubmit} size="sm">Apply</Button>
		</div>
		{#if customError}
			<p class="text-xs text-red-500 mt-1">{customError}</p>
		{/if}
	</div>

	<!-- Clear button -->
	{#if showClear && onClear}
		<Button onclick={handleClear} variant="outline" size="sm" class="w-full" data-testid="color-picker-clear-button">Clear</Button>
	{/if}
</div>

<style>
	/* Component wrapper */
</style>
