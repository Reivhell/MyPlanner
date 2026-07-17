<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { api } from '$lib/api';
	import StepLayout from '$lib/components/layouts/StepLayout.svelte';
	import type { Project, GetResumeCursorResponse } from '@planner/shared';

	type ResumeCursor = GetResumeCursorResponse['data'];

	const STATUS_ORDER = ['idea', 'interview', 'stack', 'planning', 'specification', 'tasks', 'completed'];

	const PROJECT_STEP_ROUTES: Record<string, string> = {
		idea: '/project/{id}/interview',
		interview: '/project/{id}/interview',
		stack: '/project/{id}/tech-stack',
		planning: '/project/{id}/graph',
		specification: '/project/{id}/prd',
		tasks: '/project/{id}/tasks',
		completed: '/project/{id}/export',
	};

	let project = $state<Project | null>(null);
	let resume = $state<ResumeCursor | null>(null);
	let loading = $state(true);
	let error = $state('');

	const id = $derived($page.params.id);

	$effect(() => {
		if (!id) return;

		(async () => {
			try {
				const { data: p } = await api.get<Project>(`/api/projects/${id}`);
				project = p;
				const { data: r } = await api.get<ResumeCursor>(`/api/projects/${id}/resume`);
				resume = r;
				loading = false;

				// Route to the correct step
				if (!resume) return;
				const target = PROJECT_STEP_ROUTES[resume.step];
				if (target) {
					const path = target.replace('{id}', id);
					goto(path, { replaceState: true });
				}
			} catch (e) {
				error = e instanceof Error ? e.message : 'Failed to load project';
				loading = false;
			}
		})();
	});
</script>

<StepLayout projectId={id} step={resume?.stepNumber ?? 1}>
	{#if loading}
		<div class="flex items-center justify-center min-h-[40vh]">
			<div class="text-on-surface-variant text-sm animate-pulse">Loading project…</div>
		</div>
	{:else if error}
		<div class="rounded-xl border border-error-container bg-error-container/10 p-6 text-center">
			<p class="text-error font-medium">{error}</p>
			<button
				class="mt-3 px-4 py-2 rounded-lg bg-error text-on-error text-sm font-medium cursor-pointer"
				onclick={() => goto('/')}
			>
				Back to Home
			</button>
		</div>
	{:else}
		<div class="flex items-center justify-center min-h-[40vh] text-on-surface-variant text-sm">
			Redirecting to step {resume?.stepNumber}…
		</div>
	{/if}
</StepLayout>
