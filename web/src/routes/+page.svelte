<svelte:head>
	<title>LazyQMK Dashboard</title>
</svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';
	import { apiClient, type HealthResponse } from '$api';
	import { Button, Card } from '$components';

	let health = $state<HealthResponse | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
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

	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		<!-- Status Card -->
		<Card class="p-6">
			<h2 class="text-xl font-semibold mb-4">Backend Status</h2>
			{#if loading}
				<p class="text-muted-foreground">Connecting...</p>
			{:else if error}
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
			<a href="/setup">
				<Button>Start Setup Wizard</Button>
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
</div>
