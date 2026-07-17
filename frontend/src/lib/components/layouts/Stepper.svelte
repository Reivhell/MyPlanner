<script lang="ts">
	let {
		current = 1,
		steps = [
			'Create Project',
			'Interview',
			'Tech Stack',
			'Planning Graph',
			'Generate PRD',
			'Generate Specification',
			'Generate Tasks',
			'Export AI Workspace',
		],
	}: { current?: number; steps?: string[] } = $props();
</script>

<div class="flex items-center w-full">
	{#each steps as step, i}
		{@const n = i + 1}
		<div class="flex flex-col items-center gap-1">
			{#if n < current}
				<div class="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-on-primary text-xs">
					<span class="text-xs">✓</span>
				</div>
			{:else if n === current}
				<div class="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-on-primary text-xs ring-2 ring-primary-fixed-dim ring-offset-2">
					{n}
				</div>
			{:else}
				<div class="flex items-center justify-center w-6 h-6 rounded-full border-2 border-outline-variant text-on-surface-variant text-xs">
					{n}
				</div>
			{/if}
			<span
				class="text-xs whitespace-nowrap {n < current ? 'text-primary' : n === current ? 'text-on-surface font-semibold' : 'text-on-surface-variant'}"
			>
				{step}
			</span>
		</div>
		{#if i < steps.length - 1}
			<div class="flex-1 border-t-2 {n < current ? 'border-primary' : 'border-border'} mx-2" />
		{/if}
	{/each}
</div>
