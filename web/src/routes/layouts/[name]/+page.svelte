<script lang="ts">
	import { Button, Card, KeyboardPreview, Input, Tabs } from '$components';
	import { apiClient } from '$api';
	import type { PageData } from './$types';
	import type {
		GeometryResponse,
		Layout,
		TapDance,
		Combo,
		ValidationResponse,
		InspectResponse,
		ExportResponse,
		GenerateResponse
	} from '$api/types';

	let { data }: { data: PageData } = $props();
	// Use $derived.by to properly react to data changes
	let layout = $derived.by(() => data.layout);
	let filename = $derived(data.filename);
	let isDirty = $state(false);
	let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let saveError = $state<string | null>(null);

	// Tab navigation
	const tabs = [
		{ id: 'preview', label: 'Preview', icon: '⌨️' },
		{ id: 'tap-dance', label: 'Tap Dance', icon: '💃' },
		{ id: 'combos', label: 'Combos', icon: '🔗' },
		{ id: 'idle-effect', label: 'Idle Effect', icon: '💤' },
		{ id: 'validate', label: 'Validate', icon: '✓' },
		{ id: 'inspect', label: 'Inspect', icon: '🔍' },
		{ id: 'export', label: 'Export', icon: '📄' },
		{ id: 'generate', label: 'Generate', icon: '⚙️' }
	];
	let activeTab = $state('preview');

	// State for keyboard preview
	let geometry = $state<GeometryResponse | null>(null);
	let geometryError = $state<string | null>(null);
	let geometryLoading = $state(false);
	let selectedKeyIndex = $state<number | null>(null);
	let selectedLayerIndex = $state(0);

	// State for validation/inspect/export/generate
	let validationResult = $state<ValidationResponse | null>(null);
	let validationLoading = $state(false);
	let inspectResult = $state<InspectResponse | null>(null);
	let inspectLoading = $state(false);
	let exportResult = $state<ExportResponse | null>(null);
	let exportLoading = $state(false);
	let generateResult = $state<GenerateResponse | null>(null);
	let generateLoading = $state(false);

	// Load geometry when layout is available
	$effect(() => {
		if (layout?.metadata.keyboard && layout?.metadata.layout_variant) {
			loadGeometry(layout.metadata.keyboard, layout.metadata.layout_variant);
		} else if (layout?.metadata.keyboard && layout?.metadata.layout) {
			loadGeometry(layout.metadata.keyboard, layout.metadata.layout);
		}
	});

	async function loadGeometry(keyboard: string, layoutName: string) {
		geometryLoading = true;
		geometryError = null;
		try {
			geometry = await apiClient.getGeometry(keyboard, layoutName);
		} catch (e) {
			geometryError = e instanceof Error ? e.message : 'Failed to load keyboard geometry';
			geometry = null;
		} finally {
			geometryLoading = false;
		}
	}

	function handleKeyClick(visualIndex: number, matrixRow: number, matrixCol: number) {
		selectedKeyIndex = visualIndex;
	}

	function handleLayerChange(index: number) {
		selectedLayerIndex = index;
		selectedKeyIndex = null;
	}

	// Get key assignments for the current layer
	const currentLayerKeys = $derived(layout?.layers[selectedLayerIndex]?.keys ?? []);

	// Get selected key details
	const selectedKey = $derived.by(() => {
		if (selectedKeyIndex === null || !currentLayerKeys.length) return null;
		return currentLayerKeys.find((k) => k.visual_index === selectedKeyIndex) ?? null;
	});

	// Save functionality
	async function saveLayout() {
		if (!layout || !filename) return;
		saveStatus = 'saving';
		saveError = null;
		try {
			await apiClient.saveLayout(filename, layout);
			saveStatus = 'saved';
			isDirty = false;
			setTimeout(() => {
				if (saveStatus === 'saved') saveStatus = 'idle';
			}, 2000);
		} catch (e) {
			saveStatus = 'error';
			saveError = e instanceof Error ? e.message : 'Failed to save';
		}
	}

	// Tap Dance management
	function addTapDance() {
		if (!layout) return;
		const newTd: TapDance = {
			name: `TD_${(layout.tap_dances?.length ?? 0) + 1}`,
			single_tap: 'KC_NO',
			double_tap: undefined,
			hold: undefined
		};
		layout.tap_dances = [...(layout.tap_dances ?? []), newTd];
		isDirty = true;
	}

	function updateTapDance(index: number, field: keyof TapDance, value: string) {
		if (!layout?.tap_dances) return;
		const td = layout.tap_dances[index];
		if (field === 'name') td.name = value;
		else if (field === 'single_tap') td.single_tap = value;
		else if (field === 'double_tap') td.double_tap = value || undefined;
		else if (field === 'hold') td.hold = value || undefined;
		layout.tap_dances = [...layout.tap_dances];
		isDirty = true;
	}

	function removeTapDance(index: number) {
		if (!layout?.tap_dances) return;
		layout.tap_dances = layout.tap_dances.filter((_, i) => i !== index);
		isDirty = true;
	}

	// Combo management
	function addCombo() {
		if (!layout) return;
		const newCombo: Combo = {
			id: `combo_${(layout.combos?.length ?? 0) + 1}`,
			name: `Combo ${(layout.combos?.length ?? 0) + 1}`,
			keys: ['KC_A', 'KC_B'],
			output: 'KC_C'
		};
		layout.combos = [...(layout.combos ?? []), newCombo];
		isDirty = true;
	}

	function updateCombo(index: number, field: keyof Combo, value: string | string[]) {
		if (!layout?.combos) return;
		const combo = layout.combos[index];
		if (field === 'keys') {
			combo.keys = Array.isArray(value) ? value : value.split(',').map((k) => k.trim());
		} else if (field === 'id') {
			combo.id = value as string;
		} else if (field === 'name') {
			combo.name = value as string;
		} else if (field === 'output') {
			combo.output = value as string;
		}
		layout.combos = [...layout.combos];
		isDirty = true;
	}

	function removeCombo(index: number) {
		if (!layout?.combos) return;
		layout.combos = layout.combos.filter((_, i) => i !== index);
		isDirty = true;
	}

	// Idle effect settings
	function updateIdleEffect(field: string, value: boolean | number | string) {
		if (!layout) return;
		if (!layout.idle_effect_settings) {
			layout.idle_effect_settings = {
				enabled: true,
				idle_timeout_ms: 60000,
				idle_effect_duration_ms: 300000,
				idle_effect_mode: 'Breathing'
			};
		}
		if (field === 'enabled') {
			layout.idle_effect_settings.enabled = value as boolean;
		} else if (field === 'idle_timeout_ms') {
			layout.idle_effect_settings.idle_timeout_ms = value as number;
		} else if (field === 'idle_effect_duration_ms') {
			layout.idle_effect_settings.idle_effect_duration_ms = value as number;
		} else if (field === 'idle_effect_mode') {
			layout.idle_effect_settings.idle_effect_mode = value as string;
		}
		layout = { ...layout };
		isDirty = true;
	}

	// Validate
	async function runValidation() {
		if (!filename) return;
		validationLoading = true;
		try {
			validationResult = await apiClient.validateLayout(filename);
		} catch (e) {
			validationResult = {
				valid: false,
				error: e instanceof Error ? e.message : 'Validation failed',
				warnings: []
			};
		} finally {
			validationLoading = false;
		}
	}

	// Inspect
	async function runInspect() {
		if (!filename) return;
		inspectLoading = true;
		try {
			inspectResult = await apiClient.inspectLayout(filename);
		} catch (e) {
			inspectResult = null;
		} finally {
			inspectLoading = false;
		}
	}

	// Export
	async function runExport() {
		if (!filename) return;
		exportLoading = true;
		try {
			exportResult = await apiClient.exportLayout(filename);
		} catch (e) {
			exportResult = null;
		} finally {
			exportLoading = false;
		}
	}

	function downloadExport() {
		if (!exportResult) return;
		const blob = new Blob([exportResult.markdown], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = exportResult.suggested_filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	// Generate
	async function runGenerate() {
		if (!filename) return;
		generateLoading = true;
		try {
			generateResult = await apiClient.generateFirmware(filename);
		} catch (e) {
			generateResult = {
				status: 'error',
				message: e instanceof Error ? e.message : 'Generation failed',
				job_id: undefined
			};
		} finally {
			generateLoading = false;
		}
	}
</script>

<div class="container mx-auto p-6">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold mb-1">
				{layout?.metadata.name || 'Loading...'}
			</h1>
			<p class="text-muted-foreground text-sm">
				{layout?.metadata.description || ''}
			</p>
		</div>
		<div class="flex items-center gap-3">
			{#if isDirty}
				<span class="text-sm text-yellow-500">Unsaved changes</span>
			{/if}
			{#if saveStatus === 'saved'}
				<span class="text-sm text-green-500">Saved!</span>
			{:else if saveStatus === 'error'}
				<span class="text-sm text-red-500">{saveError}</span>
			{/if}
			<Button onclick={saveLayout} disabled={!isDirty || saveStatus === 'saving'}>
				{saveStatus === 'saving' ? 'Saving...' : 'Save'}
			</Button>
			<a href="/layouts">
				<Button>Back</Button>
			</a>
		</div>
	</div>

	<!-- Tab Navigation -->
	<Tabs {tabs} {activeTab} onTabChange={(id) => (activeTab = id)} class="mb-6" />

	<!-- Tab Content -->
	{#if layout}
		{#if activeTab === 'preview'}
			<!-- Preview Tab -->
			<div class="space-y-6">
				<!-- Metadata Card -->
				<Card class="p-6">
					<h2 class="text-lg font-semibold mb-3">Metadata</h2>
					<dl class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
						<div>
							<dt class="font-medium text-muted-foreground">Keyboard</dt>
							<dd>{layout.metadata.keyboard || 'N/A'}</dd>
						</div>
						<div>
							<dt class="font-medium text-muted-foreground">Layout</dt>
							<dd>{layout.metadata.layout_variant || layout.metadata.layout || 'N/A'}</dd>
						</div>
						<div>
							<dt class="font-medium text-muted-foreground">Author</dt>
							<dd>{layout.metadata.author || 'N/A'}</dd>
						</div>
						<div>
							<dt class="font-medium text-muted-foreground">Modified</dt>
							<dd>{new Date(layout.metadata.modified).toLocaleDateString()}</dd>
						</div>
					</dl>
				</Card>

				<!-- Layer Selector -->
				<Card class="p-6">
					<h2 class="text-lg font-semibold mb-3">Layers</h2>
					<div class="flex gap-2 flex-wrap">
						{#each layout.layers as layer, i}
							<button
								onclick={() => handleLayerChange(i)}
								class="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors text-sm
									{selectedLayerIndex === i
									? 'bg-primary text-primary-foreground border-primary'
									: 'bg-background hover:bg-accent border-border'}"
							>
								<span
									class="w-2.5 h-2.5 rounded-full"
									style="background-color: {layer.color || '#888'}"
								></span>
								<span class="font-medium">{layer.name}</span>
							</button>
						{/each}
					</div>
				</Card>

				<!-- Keyboard Preview -->
				<Card class="p-6">
					<div class="flex items-center justify-between mb-4">
						<h2 class="text-lg font-semibold">Keyboard Preview</h2>
						{#if selectedKey}
							<div class="text-sm text-muted-foreground">
								Selected: <code class="px-2 py-0.5 bg-muted rounded">{selectedKey.keycode}</code>
							</div>
						{/if}
					</div>

					{#if geometryLoading}
						<div class="flex items-center justify-center h-40 text-muted-foreground">
							Loading keyboard geometry...
						</div>
					{:else if geometryError}
						<div class="flex flex-col items-center justify-center h-40 text-destructive">
							<p class="mb-2">Failed to load keyboard geometry</p>
							<p class="text-sm text-muted-foreground">{geometryError}</p>
						</div>
					{:else if geometry}
						<KeyboardPreview
							geometry={geometry.keys}
							keyAssignments={currentLayerKeys}
							{selectedKeyIndex}
							onKeyClick={handleKeyClick}
							class="max-w-4xl mx-auto"
						/>
					{:else}
						<div class="flex items-center justify-center h-40 text-muted-foreground">
							No geometry data available.
						</div>
					{/if}
				</Card>

				<!-- Key Details Card -->
				{#if selectedKey}
					<Card class="p-6">
						<h2 class="text-lg font-semibold mb-4">Key Details</h2>
						<dl class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
							<div>
								<dt class="font-medium text-muted-foreground">Visual Index</dt>
								<dd class="font-mono">{selectedKey.visual_index}</dd>
							</div>
							<div>
								<dt class="font-medium text-muted-foreground">Matrix Position</dt>
								<dd class="font-mono">
									[{selectedKey.matrix_position[0]}, {selectedKey.matrix_position[1]}]
								</dd>
							</div>
							<div>
								<dt class="font-medium text-muted-foreground">LED Index</dt>
								<dd class="font-mono">{selectedKey.led_index ?? 'N/A'}</dd>
							</div>
							<div>
								<dt class="font-medium text-muted-foreground">Keycode</dt>
								<dd class="font-mono">{selectedKey.keycode}</dd>
							</div>
						</dl>
					</Card>
				{/if}
			</div>
		{:else if activeTab === 'tap-dance'}
			<!-- Tap Dance Tab -->
			<Card class="p-6">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-semibold">Tap Dance Actions</h2>
					<Button onclick={addTapDance} size="sm">Add Tap Dance</Button>
				</div>

				{#if !layout.tap_dances?.length}
					<p class="text-muted-foreground text-sm">
						No tap dances defined. Click "Add Tap Dance" to create one.
					</p>
				{:else}
					<div class="space-y-4">
						{#each layout.tap_dances as td, i}
							<div class="border border-border rounded-lg p-4 space-y-3">
								<div class="flex items-center justify-between">
									<span class="font-mono text-sm font-medium">TD({td.name})</span>
									<Button onclick={() => removeTapDance(i)} size="sm" variant="destructive">
										Remove
									</Button>
								</div>
								<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
									<div>
										<label for="td-name-{i}" class="block text-xs font-medium text-muted-foreground mb-1">Name</label>
										<Input
											id="td-name-{i}"
											value={td.name}
											oninput={(e) => updateTapDance(i, 'name', e.currentTarget.value)}
											placeholder="TD_NAME"
											class="font-mono text-sm"
										/>
									</div>
									<div>
										<label for="td-single-{i}" class="block text-xs font-medium text-muted-foreground mb-1"
											>Single Tap</label
										>
										<Input
											id="td-single-{i}"
											value={td.single_tap || td.tap || ''}
											oninput={(e) => updateTapDance(i, 'single_tap', e.currentTarget.value)}
											placeholder="KC_A"
											class="font-mono text-sm"
										/>
									</div>
									<div>
										<label for="td-double-{i}" class="block text-xs font-medium text-muted-foreground mb-1"
											>Double Tap</label
										>
										<Input
											id="td-double-{i}"
											value={td.double_tap || ''}
											oninput={(e) => updateTapDance(i, 'double_tap', e.currentTarget.value)}
											placeholder="KC_B"
											class="font-mono text-sm"
										/>
									</div>
									<div>
										<label for="td-hold-{i}" class="block text-xs font-medium text-muted-foreground mb-1">Hold</label>
										<Input
											id="td-hold-{i}"
											value={td.hold || ''}
											oninput={(e) => updateTapDance(i, 'hold', e.currentTarget.value)}
											placeholder="KC_LCTL"
											class="font-mono text-sm"
										/>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</Card>
		{:else if activeTab === 'combos'}
			<!-- Combos Tab -->
			<Card class="p-6">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-semibold">Combos</h2>
					<Button onclick={addCombo} size="sm">Add Combo</Button>
				</div>

				{#if !layout.combos?.length}
					<p class="text-muted-foreground text-sm">
						No combos defined. Combos trigger a keycode when multiple keys are pressed
						simultaneously.
					</p>
				{:else}
					<div class="space-y-4">
						{#each layout.combos as combo, i}
							<div class="border border-border rounded-lg p-4 space-y-3">
								<div class="flex items-center justify-between">
									<span class="font-medium">{combo.name}</span>
									<Button onclick={() => removeCombo(i)} size="sm" variant="destructive">
										Remove
									</Button>
								</div>
								<div class="grid grid-cols-3 gap-3">
									<div>
										<label for="combo-name-{i}" class="block text-xs font-medium text-muted-foreground mb-1">Name</label>
										<Input
											id="combo-name-{i}"
											value={combo.name}
											oninput={(e) => updateCombo(i, 'name', e.currentTarget.value)}
											placeholder="Combo Name"
										/>
									</div>
									<div>
										<label for="combo-keys-{i}" class="block text-xs font-medium text-muted-foreground mb-1"
											>Trigger Keys (comma-separated)</label
										>
										<Input
											id="combo-keys-{i}"
											value={combo.keys.join(', ')}
											oninput={(e) => updateCombo(i, 'keys', e.currentTarget.value)}
											placeholder="KC_A, KC_B"
											class="font-mono text-sm"
										/>
									</div>
									<div>
										<label for="combo-output-{i}" class="block text-xs font-medium text-muted-foreground mb-1">Output</label
										>
										<Input
											id="combo-output-{i}"
											value={combo.output}
											oninput={(e) => updateCombo(i, 'output', e.currentTarget.value)}
											placeholder="KC_ESC"
											class="font-mono text-sm"
										/>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</Card>
		{:else if activeTab === 'idle-effect'}
			<!-- Idle Effect Tab -->
			<Card class="p-6">
				<h2 class="text-lg font-semibold mb-4">Idle Effect Settings</h2>
				<p class="text-muted-foreground text-sm mb-6">
					Configure the RGB effect that plays when the keyboard is idle.
				</p>

				<div class="space-y-4 max-w-md">
					<div class="flex items-center gap-3">
						<input
							type="checkbox"
							id="idle-enabled"
							checked={layout.idle_effect_settings?.enabled ?? true}
							onchange={(e) => updateIdleEffect('enabled', e.currentTarget.checked)}
							class="w-4 h-4"
						/>
						<label for="idle-enabled" class="text-sm font-medium">Enable Idle Effect</label>
					</div>

					<div>
						<label for="idle-timeout" class="block text-sm font-medium text-muted-foreground mb-1"
							>Idle Timeout (seconds)</label
						>
						<Input
							id="idle-timeout"
							type="number"
							value={Math.round((layout.idle_effect_settings?.idle_timeout_ms ?? 60000) / 1000)}
							oninput={(e) =>
								updateIdleEffect('idle_timeout_ms', parseInt(e.currentTarget.value) * 1000)}
							min="10"
							max="600"
						/>
						<p class="text-xs text-muted-foreground mt-1">
							Time before idle effect starts (10-600 seconds)
						</p>
					</div>

					<div>
						<label for="idle-duration" class="block text-sm font-medium text-muted-foreground mb-1"
							>Effect Duration (seconds)</label
						>
						<Input
							id="idle-duration"
							type="number"
							value={Math.round(
								(layout.idle_effect_settings?.idle_effect_duration_ms ?? 300000) / 1000
							)}
							oninput={(e) =>
								updateIdleEffect('idle_effect_duration_ms', parseInt(e.currentTarget.value) * 1000)}
							min="30"
							max="3600"
						/>
						<p class="text-xs text-muted-foreground mt-1">
							How long the effect runs before RGB turns off (30-3600 seconds)
						</p>
					</div>

					<div>
						<label for="idle-effect-mode" class="block text-sm font-medium text-muted-foreground mb-1">Effect Mode</label>
						<select
							id="idle-effect-mode"
							class="w-full px-3 py-2 border border-border rounded-lg bg-background"
							value={layout.idle_effect_settings?.idle_effect_mode ?? 'Breathing'}
							onchange={(e) => updateIdleEffect('idle_effect_mode', e.currentTarget.value)}
						>
							<option value="Solid Color">Solid Color</option>
							<option value="Breathing">Breathing</option>
							<option value="Rainbow Moving Chevron">Rainbow Moving Chevron</option>
							<option value="Cycle All">Cycle All</option>
							<option value="Cycle Left/Right">Cycle Left/Right</option>
							<option value="Cycle Up/Down">Cycle Up/Down</option>
							<option value="Rainbow Beacon">Rainbow Beacon</option>
							<option value="Rainbow Pinwheels">Rainbow Pinwheels</option>
							<option value="Jellybean Raindrops">Jellybean Raindrops</option>
						</select>
					</div>
				</div>
			</Card>
		{:else if activeTab === 'validate'}
			<!-- Validate Tab -->
			<Card class="p-6">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-semibold">Validate Layout</h2>
					<Button onclick={runValidation} disabled={validationLoading}>
						{validationLoading ? 'Validating...' : 'Run Validation'}
					</Button>
				</div>

				{#if validationResult}
					<div
						class="p-4 rounded-lg {validationResult.valid
							? 'bg-green-500/10 border border-green-500/30'
							: 'bg-red-500/10 border border-red-500/30'}"
					>
						<div class="flex items-center gap-2 mb-2">
							<span class="text-lg">{validationResult.valid ? '✓' : '✗'}</span>
							<span class="font-medium">
								{validationResult.valid ? 'Layout is valid' : 'Layout has errors'}
							</span>
						</div>

						{#if validationResult.error}
							<p class="text-red-500 text-sm">{validationResult.error}</p>
						{/if}

						{#if validationResult.warnings.length > 0}
							<div class="mt-3">
								<p class="text-sm font-medium text-yellow-500 mb-1">Warnings:</p>
								<ul class="list-disc list-inside text-sm text-muted-foreground">
									{#each validationResult.warnings as warning}
										<li>{warning}</li>
									{/each}
								</ul>
							</div>
						{/if}
					</div>
				{:else}
					<p class="text-muted-foreground text-sm">
						Click "Run Validation" to check your layout for errors.
					</p>
				{/if}
			</Card>
		{:else if activeTab === 'inspect'}
			<!-- Inspect Tab -->
			<Card class="p-6">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-semibold">Inspect Layout</h2>
					<Button onclick={runInspect} disabled={inspectLoading}>
						{inspectLoading ? 'Loading...' : 'Refresh'}
					</Button>
				</div>

				{#if inspectResult}
					<div class="space-y-6">
						<!-- Metadata -->
						<div>
							<h3 class="font-medium mb-2">Metadata</h3>
							<dl class="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
								<div>
									<dt class="text-muted-foreground">Layers</dt>
									<dd class="font-mono">{inspectResult.metadata.layer_count}</dd>
								</div>
								<div>
									<dt class="text-muted-foreground">Keys per layer</dt>
									<dd class="font-mono">{inspectResult.metadata.key_count}</dd>
								</div>
								<div>
									<dt class="text-muted-foreground">Categories</dt>
									<dd class="font-mono">{inspectResult.metadata.category_count}</dd>
								</div>
								<div>
									<dt class="text-muted-foreground">Tap Dances</dt>
									<dd class="font-mono">{inspectResult.metadata.tap_dance_count}</dd>
								</div>
								<div>
									<dt class="text-muted-foreground">Keyboard</dt>
									<dd class="font-mono">{inspectResult.metadata.keyboard || 'N/A'}</dd>
								</div>
								<div>
									<dt class="text-muted-foreground">Author</dt>
									<dd>{inspectResult.metadata.author || 'N/A'}</dd>
								</div>
							</dl>
						</div>

						<!-- Layers -->
						<div>
							<h3 class="font-medium mb-2">Layers</h3>
							<div class="overflow-x-auto">
								<table class="w-full text-sm">
									<thead>
										<tr class="border-b border-border">
											<th class="text-left py-2 px-2">#</th>
											<th class="text-left py-2 px-2">Name</th>
											<th class="text-left py-2 px-2">Keys</th>
											<th class="text-left py-2 px-2">Color</th>
											<th class="text-left py-2 px-2">Enabled</th>
										</tr>
									</thead>
									<tbody>
										{#each inspectResult.layers as layer}
											<tr class="border-b border-border/50">
												<td class="py-2 px-2 font-mono">{layer.number}</td>
												<td class="py-2 px-2">{layer.name}</td>
												<td class="py-2 px-2 font-mono">{layer.key_count}</td>
												<td class="py-2 px-2">
													<span
														class="inline-block w-4 h-4 rounded"
														style="background-color: {layer.default_color}"
													></span>
												</td>
												<td class="py-2 px-2">{layer.colors_enabled ? '✓' : '✗'}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>

						<!-- Settings -->
						<div>
							<h3 class="font-medium mb-2">Settings</h3>
							<dl class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
								<div>
									<dt class="text-muted-foreground">RGB Enabled</dt>
									<dd>{inspectResult.settings.rgb_enabled ? 'Yes' : 'No'}</dd>
								</div>
								<div>
									<dt class="text-muted-foreground">Brightness</dt>
									<dd>{inspectResult.settings.rgb_brightness}%</dd>
								</div>
								<div>
									<dt class="text-muted-foreground">Idle Effect</dt>
									<dd>{inspectResult.settings.idle_effect_mode}</dd>
								</div>
								<div>
									<dt class="text-muted-foreground">Tap-Hold Preset</dt>
									<dd>{inspectResult.settings.tap_hold_preset}</dd>
								</div>
							</dl>
						</div>
					</div>
				{:else}
					<p class="text-muted-foreground text-sm">
						Click "Refresh" to load detailed layout information.
					</p>
				{/if}
			</Card>
		{:else if activeTab === 'export'}
			<!-- Export Tab -->
			<Card class="p-6">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-semibold">Export to Markdown</h2>
					<div class="flex gap-2">
						<Button onclick={runExport} disabled={exportLoading}>
							{exportLoading ? 'Exporting...' : 'Generate Export'}
						</Button>
						{#if exportResult}
							<Button onclick={downloadExport}>Download</Button>
						{/if}
					</div>
				</div>

				{#if exportResult}
					<div class="space-y-4">
						<p class="text-sm text-muted-foreground">
							Suggested filename: <code class="bg-muted px-2 py-0.5 rounded"
								>{exportResult.suggested_filename}</code
							>
						</p>
						<div class="border border-border rounded-lg overflow-hidden">
							<pre
								class="p-4 text-sm overflow-x-auto max-h-96 bg-muted/30">{exportResult.markdown}</pre>
						</div>
					</div>
				{:else}
					<p class="text-muted-foreground text-sm">
						Generate a markdown export with keyboard diagrams and configuration summary.
					</p>
				{/if}
			</Card>
		{:else if activeTab === 'generate'}
			<!-- Generate Tab -->
			<Card class="p-6">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-semibold">Generate Firmware</h2>
					<Button onclick={runGenerate} disabled={generateLoading}>
						{generateLoading ? 'Generating...' : 'Generate Firmware'}
					</Button>
				</div>

				{#if generateResult}
					<div
						class="p-4 rounded-lg {generateResult.status === 'not_implemented'
							? 'bg-yellow-500/10 border border-yellow-500/30'
							: generateResult.status === 'error'
								? 'bg-red-500/10 border border-red-500/30'
								: 'bg-green-500/10 border border-green-500/30'}"
					>
						<p class="font-medium mb-2 capitalize">{generateResult.status.replace('_', ' ')}</p>
						<p class="text-sm text-muted-foreground">{generateResult.message}</p>
					</div>
				{:else}
					<div class="space-y-4">
						<p class="text-muted-foreground text-sm">
							Generate QMK firmware files for this layout.
						</p>
						<div class="bg-muted/30 p-4 rounded-lg">
							<p class="text-sm font-medium mb-2">CLI Alternative:</p>
							<code class="text-sm font-mono">lazyqmk generate {filename}</code>
						</div>
					</div>
				{/if}
			</Card>
		{/if}
	{/if}
</div>
