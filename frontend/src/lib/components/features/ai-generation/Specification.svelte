<script lang="ts">
	import { api } from '$lib/api';
	import type { Document } from '@planner/shared';
	import GenerateBar from './GenerateBar.svelte';
	import DocumentViewer from './DocumentViewer.svelte';

	let {
		projectId,
		onAdvanced,
	}: { projectId: string; onAdvanced?: () => void } = $props();

	let spec = $state<Document | null>(null);
	let arch = $state<Document | null>(null);
	let loading = $state(true);

	async function load() {
		loading = true;
		try {
			const { data } = await api.get<Document[]>(`/api/projects/${projectId}/documents`);
			spec = data.find((d) => d.stage === 'specification') ?? null;
			arch = data.find((d) => d.stage === 'architecture') ?? null;
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
			<h2 class="text-xl font-semibold text-on-surface mb-1">Generate Specification</h2>
			<p class="text-on-surface-variant text-sm">Technical Specification and Architecture derived from your Planning Graph.</p>
		</div>

		<div class="bg-white rounded-xl border border-border p-6 min-h-[300px] space-y-6">
			{#if loading}
				<p class="text-on-surface-variant text-sm">Loading…</p>
			{:else if spec || arch}
				{#if spec}<DocumentViewer content={spec.content} />{/if}
				{#if arch}<DocumentViewer content={arch.content} />{/if}
			{:else}
				<p class="text-on-surface-variant text-sm italic">No specification generated yet. Click Generate below.</p>
			{/if}
		</div>

		<GenerateBar {projectId} stage="specification" {onAdvanced} />
	</main>
</div>
