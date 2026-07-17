<script lang="ts">
	import type { TechStack } from '@planner/shared';

	interface StackCategory {
		category: string;
		label: string;
		suggestions: string[];
	}

	interface Props {
		categories: StackCategory[];
		gaps: string[];
		stack: TechStack | null;
		saving: boolean;
		onSave: (components: Record<string, string>) => void;
	}

	let { categories, gaps, stack, saving, onSave }: Props = $props();

	const components = $state<Record<string, string>>({});

	// Keep local inputs in sync when the stack changes from outside (e.g. auto-complete).
	$effect(() => {
		const incoming = stack?.components ?? {};
		for (const cat of categories) {
			if (components[cat.category] === undefined) components[cat.category] = incoming[cat.category] ?? '';
		}
	});

	const isGap = (cat: string) => gaps.includes(cat);

	function save() {
		const clean: Record<string, string> = {};
		for (const cat of categories) {
			const v = components[cat.category]?.trim();
			if (v) clean[cat.category] = v;
		}
		onSave(clean);
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h3 class="text-lg font-semibold text-on-surface">Manual Tech Stack</h3>
			<p class="text-sm text-on-surface-variant">Define each layer of your stack. Missing layers are flagged but won't block you.</p>
		</div>
		<button
			onclick={save}
			disabled={saving}
			class="rounded-lg bg-primary px-5 py-2.5 text-label font-label text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
		>
			{saving ? 'Saving…' : 'Save Stack'}
		</button>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each categories as cat (cat.category)}
			<div class="rounded-xl border border-border bg-surface-container-lowest p-4">
				<div class="mb-2 flex items-center justify-between">
					<label for={`ts-${cat.category}`} class="text-sm font-medium text-on-surface">{cat.label}</label>
					{#if isGap(cat.category)}
						<span class="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">Missing</span>
					{:else}
						<span class="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Set</span>
					{/if}
				</div>
				<input
					id={`ts-${cat.category}`}
					type="text"
					bind:value={components[cat.category]}
					placeholder="e.g. {cat.suggestions[0]}"
					class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
				/>
				<div class="mt-2 flex flex-wrap gap-1">
					{#each cat.suggestions as s}
						<button
							type="button"
							onclick={() => (components[cat.category] = s)}
							class="rounded-md bg-surface-muted px-2 py-0.5 text-xs text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container"
						>{s}</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
