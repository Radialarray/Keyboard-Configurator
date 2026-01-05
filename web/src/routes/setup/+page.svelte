<svelte:head>
	<title>Setup Wizard - LazyQMK</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';
	import {
		apiClient,
		type ConfigResponse,
		type KeyboardInfo,
		type LayoutVariantInfo
	} from '$api';
	import { Button, Card, Input } from '$components';
	import { goto } from '$app/navigation';

	// Wizard state
	let currentStep = $state(1);
	const totalSteps = 4;

	// Step 1: QMK Path
	let config = $state<ConfigResponse | null>(null);
	let qmkPath = $state('');
	let configLoading = $state(true);
	let configError = $state<string | null>(null);
	let configSaving = $state(false);

	// Step 2: Keyboard selection
	let keyboards = $state<KeyboardInfo[]>([]);
	let keyboardsLoading = $state(false);
	let keyboardsError = $state<string | null>(null);
	let keyboardSearch = $state('');
	let selectedKeyboard = $state<string | null>(null);

	// Step 3: Layout variant selection
	let variants = $state<LayoutVariantInfo[]>([]);
	let variantsLoading = $state(false);
	let variantsError = $state<string | null>(null);
	let selectedVariant = $state<string | null>(null);

	// Step 4: Layout creation
	let layoutName = $state('');
	let layoutFilename = $state('');
	let layoutDescription = $state('');
	let layoutAuthor = $state('');
	let createLoading = $state(false);
	let createError = $state<string | null>(null);

	// Derived state
	let filteredKeyboards = $derived(
		keyboardSearch
			? keyboards.filter((k) =>
					k.path.toLowerCase().includes(keyboardSearch.toLowerCase())
				)
			: keyboards
	);

	let canProceedStep1 = $derived(qmkPath.trim() !== '' && config?.qmk_firmware_path === qmkPath);
	let canProceedStep2 = $derived(selectedKeyboard !== null);
	let canProceedStep3 = $derived(selectedVariant !== null);
	let canProceedStep4 = $derived(layoutName.trim() !== '' && layoutFilename.trim() !== '');

	onMount(async () => {
		await loadConfig();
	});

	async function loadConfig() {
		configLoading = true;
		try {
			config = await apiClient.getConfig();
			qmkPath = config.qmk_firmware_path || '';
			configError = null;
		} catch (e) {
			configError = e instanceof Error ? e.message : 'Failed to load config';
		} finally {
			configLoading = false;
		}
	}

	async function saveQmkPath() {
		configSaving = true;
		configError = null;
		try {
			await apiClient.updateConfig({ qmk_firmware_path: qmkPath || undefined });
			config = await apiClient.getConfig();
			qmkPath = config.qmk_firmware_path || '';
		} catch (e) {
			configError = e instanceof Error ? e.message : 'Failed to save settings';
		} finally {
			configSaving = false;
		}
	}

	async function loadKeyboards() {
		keyboardsLoading = true;
		keyboardsError = null;
		try {
			const response = await apiClient.listKeyboards();
			keyboards = response.keyboards;
		} catch (e) {
			keyboardsError = e instanceof Error ? e.message : 'Failed to load keyboards';
		} finally {
			keyboardsLoading = false;
		}
	}

	async function loadVariants() {
		if (!selectedKeyboard) return;
		variantsLoading = true;
		variantsError = null;
		try {
			const response = await apiClient.listKeyboardLayouts(selectedKeyboard);
			variants = response.variants;
		} catch (e) {
			variantsError = e instanceof Error ? e.message : 'Failed to load layout variants';
		} finally {
			variantsLoading = false;
		}
	}

	async function createLayout() {
		if (!selectedKeyboard || !selectedVariant) return;
		createLoading = true;
		createError = null;
		try {
			await apiClient.createLayout({
				filename: layoutFilename,
				name: layoutName,
				keyboard: selectedKeyboard,
				layout_variant: selectedVariant,
				description: layoutDescription || undefined,
				author: layoutAuthor || undefined
			});
			// Redirect to the new layout
			goto(`/layouts/${encodeURIComponent(layoutFilename)}`);
		} catch (e) {
			createError = e instanceof Error ? e.message : 'Failed to create layout';
		} finally {
			createLoading = false;
		}
	}

	function nextStep() {
		if (currentStep < totalSteps) {
			currentStep++;
			// Trigger data loading for each step
			if (currentStep === 2) {
				loadKeyboards();
			} else if (currentStep === 3) {
				loadVariants();
			}
		}
	}

	function prevStep() {
		if (currentStep > 1) {
			currentStep--;
		}
	}

	function selectKeyboard(path: string) {
		selectedKeyboard = path;
		selectedVariant = null; // Reset variant when keyboard changes
	}

	function selectVariant(name: string) {
		selectedVariant = name;
	}

	// Auto-generate filename from name
	$effect(() => {
		if (layoutName && !layoutFilename) {
			layoutFilename = layoutName
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '_')
				.replace(/^_|_$/g, '');
		}
	});
</script>

<div class="container mx-auto p-6">
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-4xl font-bold mb-2">Setup Wizard</h1>
			<p class="text-muted-foreground">Create a new keyboard layout in {totalSteps} easy steps</p>
		</div>
		<a href="/">
			<Button variant="outline">Cancel</Button>
		</a>
	</div>

	<!-- Progress indicator -->
	<div class="mb-8" data-testid="progress-indicator">
		<div class="flex justify-between mb-2">
			{#each Array(totalSteps) as _, i}
				<div class="flex items-center gap-2">
					<div
						class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
						{i + 1 < currentStep
							? 'bg-primary text-primary-foreground'
							: i + 1 === currentStep
								? 'bg-primary text-primary-foreground'
								: 'bg-muted text-muted-foreground'}"
						data-testid="step-indicator-{i + 1}"
					>
						{i + 1}
					</div>
					<span
						class="text-sm hidden sm:inline
						{i + 1 === currentStep ? 'font-medium' : 'text-muted-foreground'}"
						data-testid="step-label-{i + 1}"
					>
						{#if i === 0}
							QMK Path
						{:else if i === 1}
							Keyboard
						{:else if i === 2}
							Layout
						{:else}
							Create
						{/if}
					</span>
				</div>
				{#if i < totalSteps - 1}
					<div
						class="flex-1 h-0.5 self-center mx-2 {i + 1 < currentStep
							? 'bg-primary'
							: 'bg-muted'}"
					></div>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Step content -->
	<div class="max-w-2xl">
		{#if currentStep === 1}
			<!-- Step 1: QMK Path Configuration -->
			<Card class="p-6">
				<h2 class="text-2xl font-semibold mb-4" data-testid="step-heading">Step 1: Configure QMK Firmware Path</h2>
				<p class="text-muted-foreground mb-6">
					Provide the path to your QMK firmware directory. This is needed to read keyboard
					definitions and build firmware.
				</p>

				{#if configLoading}
					<p class="text-muted-foreground">Loading configuration...</p>
				{:else}
					<div class="space-y-4">
						<div>
							<label for="qmk-path" class="block text-sm font-medium mb-2"
								>QMK Firmware Path</label
							>
							<Input
								id="qmk-path"
								bind:value={qmkPath}
								placeholder="/path/to/qmk_firmware"
							/>
						</div>

						{#if configError}
							<div class="p-3 bg-destructive/10 border border-destructive rounded text-sm text-destructive">
								{configError}
							</div>
						{/if}

						{#if config?.qmk_firmware_path && config.qmk_firmware_path === qmkPath}
							<div class="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded text-sm text-green-800 dark:text-green-200">
								QMK path is configured correctly
							</div>
						{:else if qmkPath && qmkPath !== config?.qmk_firmware_path}
							<Button onclick={saveQmkPath} disabled={configSaving}>
								{configSaving ? 'Saving...' : 'Save Path'}
							</Button>
						{/if}
					</div>
				{/if}
			</Card>
		{:else if currentStep === 2}
			<!-- Step 2: Keyboard Selection -->
			<Card class="p-6">
				<h2 class="text-2xl font-semibold mb-4" data-testid="step-heading">Step 2: Select Keyboard</h2>
				<p class="text-muted-foreground mb-6">
					Choose your keyboard from the list. You can search to filter the results.
				</p>

				{#if keyboardsLoading}
					<p class="text-muted-foreground">Loading keyboards...</p>
				{:else if keyboardsError}
					<div class="p-3 bg-destructive/10 border border-destructive rounded text-sm text-destructive mb-4">
						{keyboardsError}
					</div>
					<Button onclick={loadKeyboards}>Retry</Button>
				{:else}
					<div class="space-y-4">
						<Input
							bind:value={keyboardSearch}
							placeholder="Search keyboards..."
							data-testid="keyboard-search-input"
						/>

						<div class="max-h-96 overflow-y-auto border rounded">
							{#if filteredKeyboards.length === 0}
								<p class="p-4 text-muted-foreground text-center">No keyboards found</p>
							{:else}
								{#each filteredKeyboards as keyboard}
									<button
										class="w-full p-3 text-left hover:bg-muted border-b last:border-b-0 flex justify-between items-center
										{selectedKeyboard === keyboard.path ? 'bg-primary/10 border-l-4 border-l-primary' : ''}"
										onclick={() => selectKeyboard(keyboard.path)}
									>
										<span class="font-mono text-sm">{keyboard.path}</span>
										<span class="text-xs text-muted-foreground">
											{keyboard.layout_count} layout{keyboard.layout_count !== 1 ? 's' : ''}
										</span>
									</button>
								{/each}
							{/if}
						</div>

						{#if selectedKeyboard}
							<p class="text-sm">
								Selected: <code class="bg-muted px-2 py-1 rounded">{selectedKeyboard}</code>
							</p>
						{/if}
					</div>
				{/if}
			</Card>
		{:else if currentStep === 3}
			<!-- Step 3: Layout Variant Selection -->
			<Card class="p-6">
				<h2 class="text-2xl font-semibold mb-4" data-testid="step-heading">Step 3: Select Layout Variant</h2>
				<p class="text-muted-foreground mb-6">
					Choose the physical layout variant for your keyboard. Different variants may have
					different key counts.
				</p>

				{#if variantsLoading}
					<p class="text-muted-foreground">Loading layout variants...</p>
				{:else if variantsError}
					<div class="p-3 bg-destructive/10 border border-destructive rounded text-sm text-destructive mb-4">
						{variantsError}
					</div>
					<Button onclick={loadVariants}>Retry</Button>
				{:else}
					<div class="space-y-4">
						<p class="text-sm text-muted-foreground">
							Keyboard: <code class="bg-muted px-2 py-1 rounded">{selectedKeyboard}</code>
						</p>

						<div class="grid gap-3">
							{#each variants as variant}
								<button
									class="p-4 border rounded text-left hover:bg-muted flex justify-between items-center
									{selectedVariant === variant.name ? 'bg-primary/10 border-primary border-2' : ''}"
									onclick={() => selectVariant(variant.name)}
								>
									<span class="font-mono">{variant.name}</span>
									<span class="text-sm text-muted-foreground">
										{variant.key_count} keys
									</span>
								</button>
							{/each}
						</div>

						{#if selectedVariant}
							<p class="text-sm">
								Selected: <code class="bg-muted px-2 py-1 rounded">{selectedVariant}</code>
							</p>
						{/if}
					</div>
				{/if}
			</Card>
		{:else if currentStep === 4}
			<!-- Step 4: Create Layout -->
			<Card class="p-6">
				<h2 class="text-2xl font-semibold mb-4" data-testid="step-heading">Step 4: Create Layout</h2>
				<p class="text-muted-foreground mb-6">
					Enter the details for your new layout.
				</p>

				<div class="space-y-4">
					<div class="p-3 bg-muted rounded text-sm space-y-1">
						<p>
							<span class="text-muted-foreground">Keyboard:</span>{' '}
							<code>{selectedKeyboard}</code>
						</p>
						<p>
							<span class="text-muted-foreground">Layout:</span>{' '}
							<code>{selectedVariant}</code>
						</p>
					</div>

					<div>
						<label for="layout-name" class="block text-sm font-medium mb-2">
							Layout Name <span class="text-destructive">*</span>
						</label>
						<Input
							id="layout-name"
							bind:value={layoutName}
							placeholder="My Custom Layout"
						/>
					</div>

					<div>
						<label for="layout-filename" class="block text-sm font-medium mb-2">
							Filename <span class="text-destructive">*</span>
						</label>
						<Input
							id="layout-filename"
							bind:value={layoutFilename}
							placeholder="my_custom_layout"
						/>
						<p class="text-xs text-muted-foreground mt-1">
							Will be saved as <code>{layoutFilename || 'filename'}.md</code>
						</p>
					</div>

					<div>
						<label for="layout-description" class="block text-sm font-medium mb-2">
							Description
						</label>
						<Input
							id="layout-description"
							bind:value={layoutDescription}
							placeholder="A brief description of this layout"
						/>
					</div>

					<div>
						<label for="layout-author" class="block text-sm font-medium mb-2">Author</label>
						<Input id="layout-author" bind:value={layoutAuthor} placeholder="Your name" />
					</div>

					{#if createError}
						<div class="p-3 bg-destructive/10 border border-destructive rounded text-sm text-destructive">
							{createError}
						</div>
					{/if}
				</div>
			</Card>
		{/if}

		<!-- Navigation buttons -->
		<div class="flex justify-between mt-6">
			<Button variant="outline" onclick={prevStep} disabled={currentStep === 1}>
				Previous
			</Button>

			{#if currentStep < totalSteps}
				<Button
					onclick={nextStep}
					disabled={(currentStep === 1 && !canProceedStep1) ||
						(currentStep === 2 && !canProceedStep2) ||
						(currentStep === 3 && !canProceedStep3)}
				>
					Next
				</Button>
			{:else}
				<Button onclick={createLayout} disabled={!canProceedStep4 || createLoading}>
					{createLoading ? 'Creating...' : 'Create Layout'}
				</Button>
			{/if}
		</div>
	</div>
</div>
