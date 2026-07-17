<script lang="ts">
	import CreateProjectDialog from './CreateProjectDialog.svelte';
	import { goto } from '$app/navigation';
	import { api } from '$lib/api';
	import type { Project } from '@planner/shared';

	const STATUS_LABELS: Record<string, string> = {
		idea: 'Idea',
		interview: 'Interview',
		stack: 'Tech Stack',
		planning: 'Planning Graph',
		specification: 'Generate PRD',
		tasks: 'Generate Tasks',
		completed: 'Completed',
	};

	const STATUS_ORDER = ['idea', 'interview', 'stack', 'planning', 'specification', 'tasks', 'completed'];
	const SKEL_ITEMS = [1, 2, 3];
	const STEP_DOTS = [1, 2, 3, 4, 5, 6, 7];

	let projects = $state<Project[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showCreate = $state(false);

	function statusStep(s: string): number {
		const idx = STATUS_ORDER.indexOf(s);
		return idx >= 0 ? idx + 1 : 0;
	}

	function timeAgo(iso: string): string {
		const diff = Date.now() - new Date(iso).getTime();
		const mins = Math.round(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.round(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		return `${Math.round(hrs / 24)}d ago`;
	}

	async function load() {
		loading = true;
		error = '';
		try {
			const { data } = await api.get<Project[]>('/api/projects');
			projects = data || [];
		} catch {
			error = 'Could not connect to backend. Make sure it is running.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		load();
	});

	function handleCreated() {
		showCreate = false;
		load();
	}

	async function remove(id: string) {
		if (!confirm('Delete this project? This cannot be undone.')) return;
		try {
			await api.delete(`/api/projects/${id}`);
			projects = projects.filter((p) => p.id !== id);
		} catch {
			error = 'Could not delete project. Make sure the backend is running.';
		}
	}
</script>

<div class="max-w-4xl mx-auto p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-on-surface">Projects</h1>
			<p class="text-on-surface-variant text-sm mt-1">Create and manage your product plans</p>
		</div>
		<button
			class="px-4 py-2 rounded-lg bg-primary text-on-primary font-medium text-sm hover:brightness-110 transition-all cursor-pointer"
			onclick={() => (showCreate = true)}
		>
			New Project
		</button>
	</div>

	{#if loading}
		<div class="space-y-4">
			{#each SKEL_ITEMS as _item}
				<div class="rounded-xl border border-border bg-surface p-5 animate-pulse">
					<div class="h-5 w-48 bg-surface-container-high rounded mb-3" />
					<div class="h-3 w-64 bg-surface-container-high rounded" />
				</div>
			{/each}
		</div>
	{:else if error}
		<div class="rounded-xl border border-error-container bg-error-container/10 p-6 text-center">
			<p class="text-error font-medium">{error}</p>
			<button
				class="mt-3 px-4 py-2 rounded-lg bg-error text-on-error text-sm font-medium cursor-pointer"
				onclick={load}
			>
				Retry
			</button>
		</div>
	{:else if projects.length === 0}
		<div class="rounded-xl border border-border bg-surface p-12 text-center">
			<div class="text-4xl mb-3">📋</div>
			<h2 class="text-lg font-semibold text-on-surface mb-1">No projects yet</h2>
			<p class="text-on-surface-variant text-sm mb-4">Create your first project to get started.</p>
			<button
				class="px-4 py-2 rounded-lg bg-primary text-on-primary font-medium text-sm cursor-pointer"
				onclick={() => (showCreate = true)}
			>
				Create Project
			</button>
		</div>
	{:else}
		<div class="space-y-3">
			{#each projects as project}
				<div
					class="w-full text-left rounded-xl border border-border bg-surface p-5 hover:border-primary-fixed-dim hover:shadow-sm transition-all cursor-pointer"
					role="button"
					tabindex="0"
					onclick={() => goto(`/project/${project.id}`)}
					onkeydown={(e) => { if (e.key === 'Enter') goto(`/project/${project.id}`); }}
				>
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0 flex-1">
							<h3 class="font-semibold text-on-surface truncate">{project.name}</h3>
							<p class="text-sm text-on-surface-variant mt-1 line-clamp-2">{project.idea}</p>
							<div class="flex items-center gap-3 mt-3 text-xs text-on-surface-variant">
								<span>{timeAgo(project.updatedAt)}</span>
							</div>
						</div>
						<div class="flex flex-col items-end gap-2 shrink-0">
							<span
								class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-container text-on-primary-container"
							>
								Step {statusStep(project.status)} of 7 — {STATUS_LABELS[project.status] || project.status}
							</span>
							<div class="flex items-center gap-1">
								<button
									type="button"
									class="mt-2 px-2 py-1 rounded-lg text-xs font-medium text-on-surface-variant hover:bg-error-container/20 hover:text-error transition-colors cursor-pointer"
									onclick={(e) => {
										e.stopPropagation();
										remove(project.id);
									}}
								>
									Delete
								</button>
								{#each STEP_DOTS as dot}
									{@const projectStep = statusStep(project.status)}
									<div
										class="w-2 h-2 rounded-full {dot < projectStep ? 'bg-primary' : dot === projectStep ? 'bg-primary-fixed-dim' : 'bg-surface-container-high'}"
									/>
								{/each}
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if showCreate}
	<CreateProjectDialog
		onclose={() => (showCreate = false)}
		oncreated={handleCreated}
	/>
{/if}
