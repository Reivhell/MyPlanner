<script lang="ts">
	interface StackCategory {
		category: string;
		label: string;
		suggestions: string[];
	}

	interface Props {
		categories: StackCategory[];
		recommendations: Record<string, string>[];
		loading: boolean;
		error: string | null;
		onRequest: () => void;
		onApply: (stack: Record<string, string>) => void;
	}

	let { categories, recommendations, loading, error, onRequest, onApply }: Props = $props();

	let selected = $state<number | null>(null);

	const labelFor = (cat: string) => categories.find((c) => c.category === cat)?.label ?? cat;

	function apply(i: number) {
		selected = i;
		onApply(recommendations[i]);
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h3 class="text-lg font-semibold text-on-surface">AI Recommendations</h3>
			<p class="text-sm text-on-surface-variant">Generate opinionated, complete stacks tuned to your product idea.</p>
		</div>
		<button
			onclick={onRequest}
			disabled={loading}
			class="rounded-lg bg-primary px-5 py-2.5 text-label font-label text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
		>
			{loading ? 'Generating…' : 'Get AI Recommendations'}
		</button>
	</div>

	{#if error}
		<div class="rounded-lg border border-error/30 bg-error-container/40 px-4 py-3 text-sm text-on-error-container">
			{error}
		</div>
	{/if}

	{#if loading}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each Array(3) as _}
				<div class="h-56 animate-pulse rounded-xl border border-border bg-surface-container-lowest"></div>
			{/each}
		</div>
	{:else if recommendations.length === 0}
		<div class="rounded-xl border border-dashed border-border bg-surface-container-lowest px-4 py-10 text-center text-sm text-on-surface-variant">
			No recommendations yet. Click “Get AI Recommendations” to generate complete stacks.
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each recommendations as rec, i (i)}
				<button
					type="button"
					onclick={() => apply(i)}
					class="rounded-xl border bg-surface-container-lowest p-4 text-left transition-colors {selected === i
						? 'border-primary ring-1 ring-primary'
						: 'border-border hover:border-primary/60'}"
				>
					<div class="mb-3 flex items-center justify-between">
						<span class="text-sm font-semibold text-on-surface">Option {i + 1}</span>
						{#if selected === i}
							<span class="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-on-primary">Applied</span>
						{/if}
					</div>
					<dl class="space-y-1.5">
						{#each categories as cat (cat.category)}
							<div class="flex items-center justify-between gap-2 text-sm">
								<dt class="text-on-surface-variant">{labelFor(cat.category)}</dt>
								<dd class="font-medium text-on-surface">{rec[cat.category] ?? '—'}</dd>
							</div>
						{/each}
					</dl>
				</button>
			{/each}
		</div>
	{/if}
</div>
