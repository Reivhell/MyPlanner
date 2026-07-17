<script lang="ts">
	import { api } from '$lib/api';
	import type { GenerationRun, AiStage } from '@planner/shared';

	let {
		projectId,
		stage,
		onAdvanced,
	}: {
		projectId: string;
		stage: AiStage;
		onAdvanced?: () => void;
	} = $props();

	let run = $state<GenerationRun | null>(null);
	let errorMsg = $state<string | null>(null);
	let busy = $state(false);
	let pollTimer: ReturnType<typeof setInterval> | undefined;

	async function loadLatestRun() {
		const { data } = await api.get<GenerationRun[]>(
			`/api/projects/${projectId}/generations`
		);
		const forStage = data.filter((r) => r.stage === stage);
		run = forStage.length ? forStage[forStage.length - 1] : null;
	}

	async function dispatch() {
		errorMsg = null;
		busy = true;
		try {
			const { data } = await api.post<GenerationRun>(
				`/api/projects/${projectId}/generate`,
				{ stage }
			);
			run = data;
			startPolling();
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	function startPolling() {
		stopPolling();
		pollTimer = setInterval(async () => {
			await loadLatestRun();
			if (run && (run.state === 'completed' || run.state === 'failed' || run.state === 'canceled')) {
				stopPolling();
			}
		}, 1200);
	}
	function stopPolling() {
		if (pollTimer) clearInterval(pollTimer);
		pollTimer = undefined;
	}

	async function cancel() {
		if (!run) return;
		stopPolling();
		await api.post(`/api/generations/${run.id}/cancel`);
		await loadLatestRun();
	}

	async function accept() {
		if (!run) return;
		busy = true;
		try {
			await api.post(`/api/generations/${run.id}/accept`);
			await loadLatestRun();
			onAdvanced?.();
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function regenerate() {
		await dispatch();
	}

	$effect(() => {
		void loadLatestRun();
		return stopPolling;
	});

	const phase = $derived(run?.state ?? 'idle');
	const isGenerating = $derived(phase === 'generating' || busy);
</script>

<div class="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3">
	{#if phase === 'idle' || phase === 'completed'}
		<button
			class="px-5 py-2 rounded-lg bg-primary text-on-primary font-label hover:bg-primary-container disabled:opacity-50"
			disabled={busy}
			onclick={dispatch}
		>
			Generate
		</button>
	{:else if isGenerating}
		<span class="flex items-center gap-2 text-on-surface-variant font-label">
			<span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary"></span>
			Generating…
		</span>
		<button
			class="px-4 py-2 rounded-lg border border-border font-label text-on-surface-variant hover:bg-surface-container"
			onclick={cancel}
		>
			Cancel
		</button>
	{:else if phase === 'draft'}
		<button
			class="px-5 py-2 rounded-lg bg-primary text-on-primary font-label hover:bg-primary-container disabled:opacity-50"
			disabled={busy}
			onclick={accept}
		>
			Accept
		</button>
		<button
			class="px-4 py-2 rounded-lg border border-border font-label text-on-surface-variant hover:bg-surface-container"
			onclick={regenerate}
		>
			Regenerate
		</button>
	{:else if phase === 'failed'}
		<span class="text-sm text-error font-label" title={run?.error ?? ''}>
			Failed: {run?.error ?? 'unknown error'}
		</span>
		<button
			class="px-4 py-2 rounded-lg border border-border font-label text-on-surface-variant hover:bg-surface-container"
			onclick={regenerate}
		>
			Retry
		</button>
	{:else if phase === 'canceled'}
		<button
			class="px-5 py-2 rounded-lg bg-primary text-on-primary font-label hover:bg-primary-container"
			onclick={dispatch}
		>
			Generate
		</button>
	{/if}
</div>
