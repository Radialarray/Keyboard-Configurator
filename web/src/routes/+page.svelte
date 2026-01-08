<svelte:head>
	<title>LazyQMK</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { apiClient, type PreflightResponse, type LayoutSummary } from '$api';
	import { Button, Card } from '$components';
	import { getRecentLayouts, filterValidRecentLayouts, type RecentLayout } from '$lib/utils/recentLayouts';

	let preflight = $state<PreflightResponse | null>(null);
	let recentLayouts = $state<LayoutSummary[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Maximum number of recent layouts to show
	const MAX_RECENT_LAYOUTS = 5;

	onMount(async () => {
		try {
			// Check preflight first
			preflight = await apiClient.preflight();

			// If first run (no layouts and no QMK config), redirect to onboarding
			if (preflight.first_run) {
				goto('/onboarding');
				return;
			}

			// If QMK is not configured but has layouts, redirect to onboarding for setup
			if (!preflight.qmk_configured) {
				goto('/onboarding');
				return;
			}

			// Load all layouts from backend
			const response = await apiClient.listLayouts();
			
			// Get recent layouts from localStorage (tracks when user actually opened them)
			const storedRecents = getRecentLayouts();
			
			if (storedRecents.length > 0) {
				// Validate stored recents against backend (filter out deleted layouts)
				const validFilenames = new Set(response.layouts.map(l => l.filename));
				const validRecents = filterValidRecentLayouts(storedRecents, validFilenames);
				
				// Map valid recent layout filenames to full LayoutSummary objects
				const recentMap = new Map(response.layouts.map(l => [l.filename, l]));
				recentLayouts = validRecents
					.map(r => recentMap.get(r.filename))
					.filter((l): l is LayoutSummary => l !== undefined)
					.slice(0, MAX_RECENT_LAYOUTS);
			} else {
				// Fall back to most recently modified layouts if no localStorage data
				recentLayouts = response.layouts
					.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
					.slice(0, MAX_RECENT_LAYOUTS);
			}

			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to connect to backend';
		} finally {
			loading = false;
		}
	});

	function formatDate(isoDate: string): string {
		const date = new Date(isoDate);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			return 'Today';
		} else if (diffDays === 1) {
			return 'Yesterday';
		} else if (diffDays < 7) {
			return `${diffDays} days ago`;
		} else {
			return date.toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		}
	}
</script>

<div class="container mx-auto p-6">
	{#if loading}
		<div class="flex items-center justify-center h-64">
			<p class="text-muted-foreground">Loading...</p>
		</div>
	{:else if error}
		<div class="max-w-2xl mx-auto">
			<Card class="p-8 border-destructive">
				<h2 class="text-2xl font-semibold mb-4 text-destructive">Connection Error</h2>
				<p class="text-muted-foreground mb-6">{error}</p>
				<Button onclick={() => window.location.reload()}>Retry</Button>
			</Card>
		</div>
	{:else}
		<!-- Layout-focused home page -->
		<div class="max-w-4xl mx-auto">
			<!-- Header -->
			<div class="text-center mb-12">
				<h1 class="text-4xl font-bold mb-2">LazyQMK</h1>
				<p class="text-muted-foreground">
					Keyboard layout editor for QMK firmware
				</p>
			</div>

			<!-- Primary Actions -->
			<div class="grid md:grid-cols-2 gap-6 mb-12" data-testid="primary-actions">
				<a href="/onboarding" class="block" data-testid="create-layout-action">
					<Card class="p-8 h-full border-2 hover:border-primary transition-colors cursor-pointer">
						<div class="text-3xl mb-4">+</div>
						<h2 class="text-xl font-semibold mb-2">Create New Layout</h2>
						<p class="text-muted-foreground">
							Start fresh with a new keyboard layout
						</p>
					</Card>
				</a>

				<a href="/layouts" class="block" data-testid="open-layout-action">
					<Card class="p-8 h-full border-2 hover:border-primary transition-colors cursor-pointer">
						<div class="text-3xl mb-4">&#9776;</div>
						<h2 class="text-xl font-semibold mb-2">Open Existing Layout</h2>
						<p class="text-muted-foreground">
							Browse and edit your saved layouts
						</p>
					</Card>
				</a>
			</div>

			<!-- Recent Layouts -->
			<div data-testid="recent-layouts">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-xl font-semibold">Recent Layouts</h2>
					{#if recentLayouts.length > 0}
						<a href="/layouts" class="text-sm text-primary hover:underline">
							View all
						</a>
					{/if}
				</div>

				{#if recentLayouts.length === 0}
					<Card class="p-6">
						<p class="text-muted-foreground text-center">
							No layouts yet. Create your first layout to get started.
						</p>
					</Card>
				{:else}
					<div class="space-y-2">
						{#each recentLayouts as layout}
							<a href="/layouts/{encodeURIComponent(layout.filename)}" class="block" data-testid="recent-layout-item">
								<Card class="p-4 hover:border-primary transition-colors cursor-pointer">
									<div class="flex items-center justify-between">
										<div class="min-w-0 flex-1">
											<h3 class="font-medium truncate">{layout.name}</h3>
											<p class="text-sm text-muted-foreground truncate">
												{layout.description || 'No description'}
											</p>
										</div>
										<div class="text-xs text-muted-foreground ml-4 whitespace-nowrap">
											{formatDate(layout.modified)}
										</div>
									</div>
								</Card>
							</a>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
