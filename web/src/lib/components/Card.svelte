<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	interface CardProps extends HTMLAttributes<HTMLDivElement> {
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { class: className = '', children, ...restProps }: CardProps = $props();
</script>

<div
	class={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</div>
