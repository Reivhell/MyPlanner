<script lang="ts">
	import { api } from '$lib/api';
	import type { Task } from '@planner/shared';
	import GenerateBar from './GenerateBar.svelte';

	let {
		projectId,
		onAdvanced,
	}: { projectId: string; onAdvanced?: () => void } = $props();

	let tasks = $state<Task[]>([]);
	let loading = $state(true);

	const priorityLabel = (p: number) =>
		['', 'Low', 'Medium', 'High', 'Critical', 'Blocker'][p] ?? String(p);

	async function load() {
		loading = true;
		try {
			const { data } = await api.get<Task[]>(`/api/projects/${projectId}/tasks`);
			tasks = data;
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
			<h2 class="text-xl font-semibold text-on-surface mb-1">Generate Tasks</h2>
			<p class="text-on-surface-variant text-sm">An implementable task breakdown derived from your PRD and Specification.</p>
		</div>

		<div class="bg-white rounded-xl border border-border p-6 min-h-[300px]">
			{#if loading}
				<p class="text-on-surface-variant text-sm">Loading…</p>
			{:else if tasks.length}
				<div class="space-y-3">
					{#each tasks as t}
						<div class="border border-border rounded-lg p-3">
							<div class="flex items-center justify-between gap-2">
								<span class="font-label text-on-surface">{t.title}</span>
								<span class="text-xs text-on-surface-variant">{priorityLabel(t.priority)}</span>
							</div>
							<p class="text-sm text-on-surface-variant mt-1">{t.description}</p>
							<span class="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">{t.group}</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-on-surface-variant text-sm italic">No tasks generated yet. Click Generate below.</p>
			{/if}
		</div>

		<GenerateBar {projectId} stage="tasks" {onAdvanced} />
	</main>
</div>
