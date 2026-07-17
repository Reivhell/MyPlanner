<script lang="ts">
	import { api } from '$lib/api';

	let {
		projectId,
		stage,
	}: { projectId: string | undefined; stage: 'prd' | 'specification' | 'architecture' } = $props();

	let outOfSync = $state(false);
	let regenerating = $state(false);
	let error = $state('');

	async function check() {
		try {
			const { data } = await api.get<{ outOfSync: string[] }>(`/projects/${projectId}/sync`);
			outOfSync = data.outOfSync.includes(stage);
		} catch {
			outOfSync = false;
		}
	}

	async function regenerate() {
		regenerating = true;
		error = '';
		try {
			await api.post(`/projects/${projectId}/sync/regenerate`, {});
			outOfSync = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Regeneration failed';
		} finally {
			regenerating = false;
		}
	}

	$effect(() => {
		check();
	});
</script>

{#if outOfSync}
	<div class="mb-4 rounded-lg border border-warning-container bg-warning-container/10 p-3 flex items-center justify-between">
		<div class="text-sm text-on-surface">
			<span class="font-medium">Graph changed</span> — this document is out of sync with the Planning Graph.
		</div>
		<div class="flex items-center gap-2">
			{#if error}
				<span class="text-xs text-error">{error}</span>
			{/if}
			<button
				class="px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
				disabled={regenerating}
				onclick={regenerate}
			>
				{regenerating ? 'Regenerating…' : 'Regenerate'}
			</button>
		</div>
	</div>
{/if}
