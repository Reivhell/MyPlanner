<script lang="ts">
	import { page } from '$app/stores';
	import { api } from '$lib/api';
	import StepLayout from '$lib/components/layouts/StepLayout.svelte';
	import type { Project, Document, Task, ExportRecord } from '@planner/shared';

	const id = $derived($page.params.id);

	type Section = 'prd' | 'specification' | 'architecture' | 'tasks';

	let project = $state<Project | null>(null);
	let docs = $state<Document[]>([]);
	let taskCount = $state(0);
	let history = $state<ExportRecord[]>([]);
	let loading = $state(true);
	let error = $state('');

	let exporting = $state(false);
	let exportError = $state('');
	let lastExportedAt = $state<string | null>(null);

	const has = (s: Section): boolean => {
		if (s === 'tasks') return taskCount > 0;
		return docs.some((d) => d.stage === s);
	};

	const sections: { key: Section; label: string; path: string }[] = [
		{ key: 'prd', label: 'PRD', path: 'prd/' },
		{ key: 'specification', label: 'Specification', path: 'specification/' },
		{ key: 'architecture', label: 'Architecture', path: 'architecture/' },
		{ key: 'tasks', label: 'Tasks', path: 'tasks/' },
	];

	const hasPrd = $derived(has('prd'));

	async function load() {
		loading = true;
		error = '';
		try {
			const [{ data: p }, { data: d }, { data: t }, { data: h }] = await Promise.all([
				api.get<Project>(`/api/projects/${id}`),
				api.get<Document[]>(`/api/projects/${id}/documents`),
				api.get<Task[]>(`/api/projects/${id}/tasks`),
				api.get<ExportRecord[]>(`/api/projects/${id}/exports`),
			]);
			project = p;
			docs = d;
			taskCount = t.length;
			history = h;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load project';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (id) void load();
	});

	async function runExport() {
		exporting = true;
		exportError = '';
		try {
			await api.post<ExportRecord>(`/api/projects/${id}/export`);
			// Stream the assembled zip to the browser as a download.
			const a = document.createElement('a');
			a.href = `/api/projects/${id}/export/download`;
			a.download = `${project?.name ?? 'workspace'}-ai-workspace.zip`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			lastExportedAt = new Date().toISOString();
			await load();
		} catch (e) {
			exportError = e instanceof Error ? e.message : 'Export failed';
		} finally {
			exporting = false;
		}
	}

	const fmt = (iso: string) => new Date(iso).toLocaleString();
</script>

<StepLayout projectId={id} step={8}>
	{#if loading}
		<div class="flex items-center justify-center min-h-[40vh] text-on-surface-variant text-sm animate-pulse">
			Loading workspace…
		</div>
	{:else if error}
		<div class="rounded-xl border border-error-container bg-error-container/10 p-6 text-center">
			<p class="text-error font-medium">{error}</p>
		</div>
	{:else}
		<div class="space-y-6">
			<div>
				<h2 class="text-xl font-semibold text-on-surface mb-1">Export AI Workspace</h2>
				<p class="text-on-surface-variant text-sm">
					Download a portable folder with your planning graph, generated documents, and
					AI agent context files.
				</p>
			</div>

			<!-- What's included -->
			<div class="rounded-xl border border-border bg-surface p-5">
				<h3 class="text-sm font-semibold text-on-surface mb-3">What's included</h3>
				<ul class="space-y-2 font-mono text-sm">
					{#each sections as s}
						<li class="flex items-center gap-2">
							<span class={has(s.key) ? 'text-primary' : 'text-on-surface-variant'}>
								{has(s.key) ? '✅' : '❌'}
							</span>
							<span class="text-on-surface">{s.label}</span>
							<span class="text-on-surface-variant">{s.path}</span>
						</li>
					{/each}
				</ul>
				<p class="mt-3 text-xs text-on-surface-variant">
					Only generated sections are exported. Ungenerated sections are omitted (no empty
					placeholders).
				</p>
			</div>

			<!-- Export action -->
			<div class="rounded-xl border border-border bg-surface p-5">
				{#if !hasPrd}
					<p class="text-sm text-on-surface-variant mb-3">
						A generated PRD is required before export.
					</p>
				{/if}
				<button
					class="px-5 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={!hasPrd || exporting}
					onclick={runExport}
				>
					{exporting ? 'Exporting…' : 'Export workspace'}
				</button>
				{#if exportError}
					<p class="mt-3 text-sm text-error">{exportError}</p>
				{/if}
				{#if lastExportedAt}
					<p class="mt-3 text-sm text-primary">
						Exported at {fmt(lastExportedAt)}. Project marked complete.
					</p>
				{/if}
			</div>

			<!-- History -->
			<div class="rounded-xl border border-border bg-surface p-5">
				<h3 class="text-sm font-semibold text-on-surface mb-3">Export history</h3>
				{#if history.length === 0}
					<p class="text-sm text-on-surface-variant">No previous exports.</p>
				{:else}
					<ul class="divide-y divide-border">
						{#each history.slice().reverse() as h}
							<li class="py-2 flex items-center justify-between text-sm">
								<span class="text-on-surface">{fmt(h.createdAt)}</span>
								<a
									class="text-primary hover:underline"
									href={`/api/projects/${id}/export/download`}
									download={`${project?.name ?? 'workspace'}-ai-workspace.zip`}
								>
									Download
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	{/if}
</StepLayout>
