<script lang="ts">
	import Stepper from './Stepper.svelte';
	import Sidebar from './Sidebar.svelte';

	let {
		step = 1,
		projectId = '',
		children,
	}: { step?: number; projectId?: string; children?: import('svelte').Snippet } = $props();
</script>

<div class="flex min-h-screen bg-surface-muted">
	<Sidebar active="home" />
	<main class="flex-1 ml-64">
		<div class="max-w-5xl mx-auto p-6">
			<div class="mb-6">
				<Stepper current={step} />
			</div>
			{#if children}
				{@render children()}
			{/if}
		</div>
	</main>
</div>
