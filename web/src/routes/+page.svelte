<svelte:head>
	<title>LazyQMK Dashboard</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { apiClient, type HealthResponse, type PreflightResponse } from '$api';
	import { Button, Card } from '$components';

	let health = $state<HealthResponse | null>(null);
	let preflight = $state<PreflightResponse | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			// Check preflight first
			preflight = await apiClient.preflight();

			// If first run (no layouts and no QMK config), redirect to onboarding
			if (preflight.first_run) {
				goto('/onboarding');
				return;
			}

			// Otherwise, load health info for dashboard
			health = await apiClient.health();
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to connect to backend';
		} finally {
			loading = false;
		}
	});
</script>

<div class="container mx-auto p-6">
	<div class="mb-8">
		<h1 class="text-4xl font-bold mb-2">LazyQMK Dashboard</h1>
		<p class="text-muted-foreground">
			Keyboard layout editor for QMK firmware
		</p>
	</div>

	{#if loading}
		<div class="flex items-center justify-center h-48">
			<p class="text-muted-foreground">Loading...</p>
		</div>
	{:else}
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
			<!-- Status Card -->
			<Card class="p-6">
				<h2 class="text-xl font-semibold mb-4">Backend Status</h2>
				{#if error}
					<div class="text-destructive">
						<p class="font-medium">Error</p>
						<p class="text-sm">{error}</p>
					</div>
				{:else if health}
					<div class="space-y-2">
						<div class="flex items-center gap-2">
							<div class="h-2 w-2 rounded-full bg-green-500"></div>
							<p class="text-sm font-medium">Connected</p>
						</div>
						<p class="text-sm text-muted-foreground">Version: {health.version}</p>
					</div>
				{/if}

				<!-- Show QMK path status -->
				{#if preflight}
					<div class="mt-4 pt-4 border-t">
						<div class="flex items-center gap-2">
							<div class="h-2 w-2 rounded-full {preflight.qmk_configured ? 'bg-green-500' : 'bg-yellow-500'}"></div>
							<p class="text-sm font-medium">
								{preflight.qmk_configured ? 'QMK Configured' : 'QMK Not Configured'}
							</p>
						</div>
						{#if !preflight.qmk_configured}
							<a href="/settings" class="text-xs text-primary hover:underline">
								Configure QMK path →
							</a>
						{/if}
					</div>
				{/if}
			</Card>

			<!-- Layouts Card -->
			<Card class="p-6">
				<h2 class="text-xl font-semibold mb-4">Layouts</h2>
				<p class="text-muted-foreground mb-4">
					Manage and edit your keyboard layouts
				</p>
				<a href="/layouts">
					<Button>View Layouts</Button>
				</a>
			</Card>

			<!-- Templates Card -->
			<Card class="p-6">
				<h2 class="text-xl font-semibold mb-4">Templates</h2>
				<p class="text-muted-foreground mb-4">
					Browse and apply layout templates
				</p>
				<a href="/templates">
					<Button>Browse Templates</Button>
				</a>
			</Card>

			<!-- Keycodes Card -->
			<Card class="p-6">
				<h2 class="text-xl font-semibold mb-4">Keycodes</h2>
				<p class="text-muted-foreground mb-4">
					Browse available QMK keycodes
				</p>
				<a href="/keycodes">
					<Button>Browse Keycodes</Button>
				</a>
			</Card>

			<!-- Settings Card -->
			<Card class="p-6">
				<h2 class="text-xl font-semibold mb-4">Settings</h2>
				<p class="text-muted-foreground mb-4">
					Configure QMK path and workspace
				</p>
				<a href="/settings">
					<Button>Open Settings</Button>
				</a>
			</Card>

			<!-- Setup Wizard Card -->
			<Card class="p-6 border-primary/50">
				<h2 class="text-xl font-semibold mb-4">New Layout</h2>
				<p class="text-muted-foreground mb-4">
					Create a new layout with the setup wizard
				</p>
				<a href="/onboarding">
					<Button>Create New Layout</Button>
				</a>
			</Card>

			<!-- Build Firmware Card -->
			<Card class="p-6" data-testid="build-card">
				<h2 class="text-xl font-semibold mb-4">Build Firmware</h2>
				<p class="text-muted-foreground mb-4">
					Compile QMK firmware from your layouts
				</p>
				<a href="/build">
					<Button data-testid="build-button">Build Firmware</Button>
				</a>
			</Card>
		</div>
	{/if}
</div>
