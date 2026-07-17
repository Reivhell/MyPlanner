<script lang="ts">
	import type { TechStack } from '@planner/shared';

	interface StackCategory {
		category: string;
		label: string;
		suggestions: string[];
	}

	interface Props {
		categories: StackCategory[];
		stack: TechStack | null;
		gaps: string[];
		onProceed: () => void;
	}

	let { categories, stack, gaps, onProceed }: Props = $props();

	const labelFor = (cat: string) => categories.find((c) => c.category === cat)?.label ?? cat;
	const components = $derived(stack?.components ?? {});
	const hasStack = $derived(Object.keys(components).length > 0);
</script>

<div class="rounded-xl border border-border bg-surface-container-lowest p-6">
	<h3 class="text-lg font-semibold text-on-surface">Tech Stack Finalized</h3>
	<p class="mt-1 text-sm text-on-surface-variant">
		{#if hasStack}
			Your stack is saved. Review it below, then proceed to the Planning Graph.
		{:else}
			Add at least one technology to save your stack.
		{/if}
	</p>

	{#if hasStack}
		<dl class="mt-4 divide-y divide-border">
			{#each categories as cat (cat.category)}
				<div class="flex items-center justify-between py-2 text-sm">
					<dt class="text-on-surface-variant">{labelFor(cat.category)}</dt>
					<dd class="font-medium text-on-surface">{components[cat.category] ?? '—'}</dd>
				</div>
			{/each}
		</dl>
	{/if}

	{#if gaps.length > 0}
		<div class="mt-4 rounded-lg bg-warning/10 px-4 py-3 text-sm text-warning">
			<span class="font-medium">{gaps.length} categor{gaps.length === 1 ? 'y' : 'ies'} not set:</span>
			{gaps.map((g) => labelFor(g)).join(', ')}. You can proceed anyway — these are just suggestions.
		</div>
	{/if}

	<button
		onclick={onProceed}
		disabled={!hasStack}
		class="mt-6 w-full rounded-lg bg-primary px-5 py-3 text-label font-label text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
	>
		Proceed to Planning Graph
	</button>
</div>
