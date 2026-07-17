<script lang="ts">
	import { page } from '$app/stores';
	import StepLayout from '$lib/components/layouts/StepLayout.svelte';
	import Graph from '$lib/components/features/graph/Graph.svelte';
	import { api } from '$lib/api';
	import { goto } from '$app/navigation';
	import type { Project } from '@planner/shared';

	const id = $derived($page.params.id);

	let project = $state<Project | null>(null);
	let advanceError = $state('');

	$effect(() => {
		if (!id) return;
		api
			.get<Project>(`/projects/${id}`)
			.then((r) => (project = r.data))
			.catch(() => {});
	});

	async function completePlanning() {
		advanceError = '';
		try {
			const { data } = await api.post<Project>(`/projects/${id}/advance`, {
				status: 'specification',
			});
			project = data;
			goto(`/project/${id}/prd`, { replaceState: true });
		} catch (e) {
			advanceError = e instanceof Error ? e.message : 'Cannot advance yet';
		}
	}
</script>

<StepLayout projectId={id} step={4}>
	<div class="flex items-center justify-between mb-4">
		<div>
			<h2 class="text-xl font-semibold text-on-surface">Planning Graph</h2>
			<p class="text-on-surface-variant text-sm">
				Drag to connect nodes. Double-click to rename. Delete key removes selection.
			</p>
		</div>
		<button
			class="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
			disabled={project?.status !== 'planning'}
			onclick={completePlanning}
		>
			Planning Complete → Generate PRD
		</button>
	</div>
	{#if advanceError}
		<div class="mb-3 rounded-lg border border-error-container bg-error-container/10 p-3 text-sm text-error">
			{advanceError}
		</div>
	{/if}
	<Graph projectId={id!} />
</StepLayout>
