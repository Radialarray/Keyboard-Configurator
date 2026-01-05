<script lang="ts">
	import { Button, Card, Input } from '$components';
	import ColorPicker from './ColorPicker.svelte';
	import { rgbToHex } from '$lib/utils/colorResolution';
	import type { Category, RgbColor } from '$api/types';

	interface Props {
		categories: Category[];
		onChange: (categories: Category[]) => void;
	}

	let { categories, onChange }: Props = $props();

	let editingCategoryId = $state<string | null>(null);
	let editingName = $state('');
	let editingColor = $state<RgbColor | undefined>(undefined);
	let addingNew = $state(false);
	let newCategoryId = $state('');
	let newCategoryName = $state('');
	let newCategoryColor = $state<RgbColor>({ r: 0, g: 128, b: 255 });
	let validationError = $state('');

	function validateCategoryId(id: string): boolean {
		if (!id) {
			validationError = 'ID cannot be empty';
			return false;
		}
		if (!/^[a-z0-9-]+$/.test(id)) {
			validationError = 'ID must be kebab-case (lowercase, hyphens, digits only)';
			return false;
		}
		if (id.startsWith('-') || id.endsWith('-')) {
			validationError = 'ID cannot start or end with a hyphen';
			return false;
		}
		if (categories.some((c) => c.id === id)) {
			validationError = 'ID already exists';
			return false;
		}
		validationError = '';
		return true;
	}

	function validateCategoryName(name: string): boolean {
		if (!name) {
			validationError = 'Name cannot be empty';
			return false;
		}
		if (name.length > 50) {
			validationError = 'Name must be 50 characters or less';
			return false;
		}
		validationError = '';
		return true;
	}

	function startEdit(category: Category) {
		editingCategoryId = category.id;
		editingName = category.name;
		editingColor = category.color;
	}

	function cancelEdit() {
		editingCategoryId = null;
		editingName = '';
		editingColor = undefined;
		validationError = '';
	}

	async function saveEdit() {
		if (!editingCategoryId || !editingName || !editingColor) return;
		if (!validateCategoryName(editingName)) return;

		const updated = categories.map((c) =>
			c.id === editingCategoryId ? { ...c, name: editingName, color: editingColor! } : c
		);
		
		// First exit edit mode
		const savedId = editingCategoryId;
		cancelEdit();
		
		// Then notify parent of changes
		// Use a small delay to ensure edit mode exits before parent updates
		setTimeout(() => {
			onChange(updated);
		}, 0);
	}

	function deleteCategory(id: string) {
		if (!confirm('Delete this category? Keys using it will lose their category assignment.')) {
			return;
		}
		const updated = categories.filter((c) => c.id !== id);
		onChange(updated);
	}

	function startAdd() {
		addingNew = true;
		newCategoryId = '';
		newCategoryName = '';
		newCategoryColor = { r: 0, g: 128, b: 255 };
		validationError = '';
	}

	function cancelAdd() {
		addingNew = false;
		newCategoryId = '';
		newCategoryName = '';
		validationError = '';
	}

	function addCategory() {
		if (!validateCategoryId(newCategoryId)) return;
		if (!validateCategoryName(newCategoryName)) return;

		const newCategory: Category = {
			id: newCategoryId,
			name: newCategoryName,
			color: newCategoryColor
		};

		onChange([...categories, newCategory]);
		cancelAdd();
	}
</script>

<Card class="p-6">
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-lg font-semibold">Category Manager</h2>
		<Button onclick={startAdd} size="sm" disabled={addingNew}>Add Category</Button>
	</div>

	{#if !categories.length && !addingNew}
		<p class="text-muted-foreground text-sm">
			No categories defined. Categories let you group keys by function (e.g., navigation, symbols)
			and assign colors to all keys in that group.
		</p>
	{:else}
		<div class="space-y-3">
			{#each categories as category}
				<div class="border border-border rounded-lg p-4">
					{#if editingCategoryId === category.id}
						<!-- Edit mode -->
						<div class="space-y-3">
							<div>
								<label for="edit-name-{category.id}" class="block text-xs font-medium text-muted-foreground mb-1"
									>Name</label
								>
								<Input
									id="edit-name-{category.id}"
									value={editingName}
									oninput={(e) => (editingName = e.currentTarget.value)}
									placeholder="Navigation"
									class="font-medium"
								/>
							</div>

							<div>
								<ColorPicker
									color={editingColor}
									onSelect={(color) => (editingColor = color)}
									label="Category Color"
								/>
							</div>

							{#if validationError}
								<p class="text-xs text-red-500">{validationError}</p>
							{/if}

							<div class="flex gap-2">
								<Button onclick={saveEdit} size="sm">Save</Button>
								<Button onclick={cancelEdit} size="sm" variant="outline">Cancel</Button>
							</div>
						</div>
					{:else}
						<!-- View mode -->
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div
									class="w-6 h-6 rounded border border-border"
									style="background-color: {rgbToHex(category.color)}"
								></div>
								<div>
									<p class="font-medium">{category.name}</p>
									<p class="text-xs text-muted-foreground font-mono">{category.id}</p>
								</div>
							</div>
							<div class="flex gap-2">
								<Button onclick={() => startEdit(category)} size="sm" variant="outline">Edit</Button>
								<Button onclick={() => deleteCategory(category.id)} size="sm" variant="destructive">
									Delete
								</Button>
							</div>
						</div>
					{/if}
				</div>
			{/each}

			{#if addingNew}
				<div class="border border-primary rounded-lg p-4 bg-primary/5">
					<h3 class="font-medium mb-3">New Category</h3>
					<div class="space-y-3">
						<div>
							<label for="new-id" class="block text-xs font-medium text-muted-foreground mb-1"
								>ID (kebab-case)</label
							>
							<Input
								id="new-id"
								value={newCategoryId}
								oninput={(e) => (newCategoryId = e.currentTarget.value)}
								placeholder="navigation"
								class="font-mono"
							/>
							<p class="text-xs text-muted-foreground mt-1">
								Lowercase letters, hyphens, and digits only
							</p>
						</div>

						<div>
							<label for="new-name" class="block text-xs font-medium text-muted-foreground mb-1">Name</label>
							<Input
								id="new-name"
								value={newCategoryName}
								oninput={(e) => (newCategoryName = e.currentTarget.value)}
								placeholder="Navigation Keys"
							/>
						</div>

						<div>
							<ColorPicker
								color={newCategoryColor}
								onSelect={(color) => (newCategoryColor = color)}
								label="Category Color"
							/>
						</div>

						{#if validationError}
							<p class="text-xs text-red-500">{validationError}</p>
						{/if}

						<div class="flex gap-2">
							<Button onclick={addCategory} size="sm">Create</Button>
							<Button onclick={cancelAdd} size="sm" variant="outline">Cancel</Button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</Card>
