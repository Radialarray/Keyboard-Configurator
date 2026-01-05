<script lang="ts">
	import { cn } from '$lib/utils';

	interface InputProps {
		type?: string;
		value?: string | number;
		placeholder?: string;
		disabled?: boolean;
		required?: boolean;
		class?: string;
		id?: string;
		min?: number | string;
		max?: number | string;
		oninput?: (e: Event & { currentTarget: HTMLInputElement }) => void;
		onchange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
		'data-testid'?: string;
	}

	let {
		type = 'text',
		value = $bindable(''),
		placeholder = '',
		disabled = false,
		required = false,
		class: className = '',
		id,
		min,
		max,
		oninput,
		onchange,
		'data-testid': testId
	}: InputProps = $props();
</script>

<input
	{id}
	{type}
	bind:value
	{placeholder}
	{disabled}
	{required}
	{min}
	{max}
	class={cn(
		'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{oninput}
	{onchange}
	data-testid={testId}
/>
