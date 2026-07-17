<script lang="ts">
	import { api } from '$lib/api';
	import type { Document, GenerationRun } from '@planner/shared';
	import GenerateBar from './GenerateBar.svelte';
	import DocumentViewer from './DocumentViewer.svelte';

	let {
		projectId,
		onAdvanced,
	}: { projectId: string; onAdvanced?: () => void } = $props();

	let doc = $state<Document | null>(null);
	let loading = $state(true);

	async function load() {
		loading = true;
		try {
			const { data } = await api.get<Document[]>(`/api/projects/${projectId}/documents`);
			doc = data.find((d) => d.stage === 'prd') ?? null;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void projectId;
		void load();
	});
</script>

<div class="bg-surface-muted text-on-surface font-body min-h-screen">
	<main class="max-w-5xl mx-auto p-6">
		<div class="mb-6">
			<h2 class="text-xl font-semibold text-on-surface mb-1">Generate PRD</h2>
			<p class="text-on-surface-variant text-sm">A Product Requirements Document derived from your Planning Graph.</p>
		</div>

		<div class="bg-white rounded-xl border border-border p-6 min-h-[300px]">
			{#if loading}
				<p class="text-on-surface-variant text-sm">Loading…</p>
			{:else if doc}
				<DocumentViewer content={doc.content} />
			{:else}
				<p class="text-on-surface-variant text-sm italic">No PRD generated yet. Click Generate below.</p>
			{/if}
		</div>

		<GenerateBar {projectId} stage="prd" {onAdvanced} />
	</main>
</div>
