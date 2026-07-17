<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { api } from '$lib/api';
	import StepLayout from '$lib/components/layouts/StepLayout.svelte';
	import TechStackManual from '$lib/components/features/tech-stack/TechStackManual.svelte';
	import TechStackRecommendation from '$lib/components/features/tech-stack/TechStackRecommendation.svelte';
	import TechStackPath from '$lib/components/features/tech-stack/TechStackPath.svelte';

	interface StackCategoryLocal {
		category: string;
		label: string;
		suggestions: string[];
	}

	const id = $derived($page.params.id);

	let categories = $state<StackCategoryLocal[]>([]);
	let gaps = $state<string[]>([]);
	let stack = $state<import('@planner/shared').TechStack | null>(null);

	let manualSaving = $state(false);
	let manualError = $state<string | null>(null);

	let recLoading = $state(false);
	let recError = $state<string | null>(null);
	let recommendations = $state<Record<string, string>[]>([]);

	let autoLoading = $state(false);
	let autoError = $state<string | null>(null);

	let advanceLoading = $state(false);
	let advanceError = $state<string | null>(null);

	let loadError = $state<string | null>(null);

	async function loadTechStack() {
		try {
			const { data } = await api.get<{ stack: import('@planner/shared').TechStack | null; categories: StackCategoryLocal[]; gaps: string[] }>(
				`/projects/${id}/tech-stack`
			);
			categories = data.categories;
			stack = data.stack;
			gaps = data.gaps;
		} catch (e) {
			loadError = (e as Error).message;
		}
	}

	async function saveStack(components: Record<string, string>) {
		manualSaving = true;
		manualError = null;
		try {
			const { data } = await api.put<{ stack: import('@planner/shared').TechStack; gaps: string[] }>(
				`/projects/${id}/tech-stack`,
				{ components }
			);
			stack = data.stack;
			gaps = data.gaps;
		} catch (e) {
			manualError = (e as Error).message;
		} finally {
			manualSaving = false;
		}
	}

	async function requestRecommendations() {
		recLoading = true;
		recError = null;
		try {
			const { data } = await api.post<{ recommendations: Record<string, string>[] }>(
				`/projects/${id}/tech-stack/recommend`
			);
			recommendations = data.recommendations;
		} catch (e) {
			recError = (e as Error).message;
		} finally {
			recLoading = false;
		}
	}

	async function applyRecommendation(components: Record<string, string>) {
		await saveStack(components);
	}

	async function autoComplete() {
		autoLoading = true;
		autoError = null;
		try {
			const { data } = await api.post<{ stack: import('@planner/shared').TechStack; gaps: string[] }>(
				`/projects/${id}/tech-stack/auto-complete`
			);
			stack = data.stack;
			gaps = data.gaps;
		} catch (e) {
			autoError = (e as Error).message;
		} finally {
			autoLoading = false;
		}
	}

	async function proceed() {
		advanceLoading = true;
		advanceError = null;
		try {
			await api.post<unknown>(`/projects/${id}/advance`, { status: 'planning' });
			await goto(`/project/${id}/graph`);
		} catch (e) {
			advanceError = (e as Error).message;
		} finally {
			advanceLoading = false;
		}
	}

	$effect(() => {
		loadTechStack();
	});
</script>

<StepLayout projectId={id} step={3}>
	<div class="mx-auto max-w-5xl px-6 py-8">
		<header class="mb-6">
			<h1 class="text-2xl font-semibold text-on-surface">Tech Stack Decision</h1>
			<p class="mt-1 text-sm text-on-surface-variant">
				Choose your technology stack. All categories are recommended, but none are required — gaps are shown as warnings, not errors.
			</p>
		</header>

		{#if loadError}
			<div class="rounded-lg border border-error/30 bg-error-container/40 px-4 py-3 text-sm text-on-error-container">
				{loadError}
			</div>
		{:else}
			<div class="space-y-10">
				<TechStackManual
					{categories}
					{gaps}
					{stack}
					saving={manualSaving}
					onSave={saveStack}
				/>

				{#if manualError}
					<div class="rounded-lg border border-error/30 bg-error-container/40 px-4 py-3 text-sm text-on-error-container">
						{manualError}
					</div>
				{/if}

				<hr class="border-border" />

				<TechStackRecommendation
					{categories}
					{recommendations}
					loading={recLoading}
					error={recError}
					onRequest={requestRecommendations}
					onApply={applyRecommendation}
				/>

				{#if gaps.length > 0}
					<div class="flex items-center justify-between rounded-xl border border-border bg-surface-container-lowest px-6 py-4">
						<div>
							<p class="text-sm font-medium text-on-surface">
								{gaps.length} categor{gaps.length === 1 ? 'y' : 'ies'} still missing
							</p>
							<p class="text-xs text-on-surface-variant">Let AI fill the remaining gaps for you.</p>
						</div>
						<button
							onclick={autoComplete}
							disabled={autoLoading}
							class="rounded-lg border border-primary px-5 py-2.5 text-label font-label text-primary transition-colors hover:bg-primary-container disabled:opacity-50"
						>
							{autoLoading ? 'Filling…' : 'Auto-complete Gaps'}
						</button>
					</div>
					{#if autoError}
						<div class="rounded-lg border border-error/30 bg-error-container/40 px-4 py-3 text-sm text-on-error-container">
							{autoError}
						</div>
					{/if}
				{/if}

				<hr class="border-border" />

				<TechStackPath {categories} {stack} {gaps} onProceed={proceed} />

				{#if advanceError}
					<div class="rounded-lg border border-error/30 bg-error-container/40 px-4 py-3 text-sm text-on-error-container">
						{advanceError}
					</div>
				{/if}
				{#if advanceLoading}
					<p class="text-center text-sm text-on-surface-variant">Advancing to Planning Graph…</p>
				{/if}
			</div>
		{/if}
	</div>
</StepLayout>
