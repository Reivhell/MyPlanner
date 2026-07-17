<script lang="ts">
	import { goto } from '$app/navigation';
	import { api } from '$lib/api';
	import type { InterviewAnswer } from '@planner/shared';

	let {
		projectId,
	}: { projectId: string } = $props();

	type Status = 'loading' | 'error' | 'ready';
	let status = $state<Status>('loading');
	let errorMsg = $state('');
	let questions = $state<InterviewAnswer[]>([]);
	let currentIndex = $state(0);
	let savingIds = $state<Set<string>>(new Set());
	let allAnswered = $state(false);
	let advancing = $state(false);

	const MIN_ANSWER_LEN = 3;

	function isAnswered(q: InterviewAnswer): boolean {
		return !!q.answer && q.answer.trim().length >= MIN_ANSWER_LEN;
	}

	async function load() {
		status = 'loading';
		errorMsg = '';
		try {
			const { data } = await api.get<InterviewAnswer[]>(`/api/projects/${projectId}/interview`);
			questions = data;
			// Resume at first unanswered question.
			const { data: next } = await api.get<InterviewAnswer | null>(
				`/api/projects/${projectId}/interview/next`
			);
			allAnswered = next === null;
			currentIndex = next
				? Math.max(0, questions.findIndex((q) => q.id === next.id))
				: 0;
			status = 'ready';
		} catch (e) {
			status = 'error';
			errorMsg = e instanceof Error ? e.message : 'Failed to load questions';
		}
	}

	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	function onInput(q: InterviewAnswer, value: string) {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => save(q, value), 2000);
	}

	async function save(q: InterviewAnswer, value: string) {
		if (q.answer === value) return;
		q.answer = value; // optimistic
		savingIds = new Set(savingIds).add(q.id);
		try {
			const { data } = await api.patch<InterviewAnswer>(
				`/api/projects/${projectId}/interview/${q.id}`,
				{ answer: value }
			);
			q.answer = data.answer;
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Failed to save answer';
		} finally {
			const next = new Set(savingIds);
			next.delete(q.id);
			savingIds = next;
		}
	}

	function onBlur(q: InterviewAnswer, value: string) {
		clearTimeout(debounceTimer);
		save(q, value);
	}

	function next() {
		if (currentIndex < questions.length - 1) currentIndex += 1;
	}
	function back() {
		if (currentIndex > 0) currentIndex -= 1;
	}

	async function proceed() {
		advancing = true;
		try {
			await api.post(`/api/projects/${projectId}/interview/complete`);
			goto(`/project/${projectId}/tech-stack`);
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Cannot proceed yet';
			advancing = false;
		}
	}

	$effect(() => {
		load();
	});
</script>

{#if status === 'loading'}
	<!-- Skeleton -->
	<div class="max-w-3xl mx-auto">
		<div class="h-4 w-24 bg-surface-container rounded mb-6 animate-pulse"></div>
		<div class="h-7 w-3/4 bg-surface-container rounded mb-3 animate-pulse"></div>
		<div class="h-4 w-1/2 bg-surface-container rounded mb-8 animate-pulse"></div>
		<div class="h-32 w-full bg-surface-container rounded-xl animate-pulse"></div>
		<div class="h-10 w-32 bg-surface-container rounded-lg mt-8 animate-pulse"></div>
	</div>
{:else if status === 'error'}
	<div class="max-w-3xl mx-auto">
		<div class="rounded-xl border border-error-container bg-error-container/10 p-6 text-center">
			<p class="text-error font-medium">Failed to load questions</p>
			<p class="text-on-surface-variant text-sm mt-1">{errorMsg}</p>
			<button
				class="mt-4 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium cursor-pointer"
				onclick={load}
			>
				Retry
			</button>
		</div>
	</div>
{:else if questions.length > 0}
	{@const current = questions[currentIndex]}
	{@const answeredCount = questions.filter(isAnswered).length}
	<div class="max-w-3xl mx-auto">
		<p class="font-small text-small text-on-surface-variant mb-2 uppercase tracking-wide">
			Question {currentIndex + 1} of {questions.length}
		</p>
		<h1 class="font-display text-display text-on-surface mb-2">{current.question}</h1>

		<div class="mt-6">
			<textarea
				class="w-full min-h-[140px] rounded-lg border border-border bg-surface-container-lowest p-4 text-body text-on-surface resize-y focus:outline-none focus:border-primary"
				placeholder="Type your answer…"
				value={current.answer}
				oninput={(e) => onInput(current, e.currentTarget.value)}
				onblur={(e) => onBlur(current, e.currentTarget.value)}
			></textarea>
		</div>

		<div class="flex items-center gap-3 mt-3 h-5">
			{#if savingIds.has(current.id)}
				<span class="text-xs text-on-surface-variant">Saving…</span>
			{:else if isAnswered(current)}
				<span class="text-xs text-primary">Saved</span>
			{/if}
			{#if errorMsg}
				<span class="text-xs text-error">{errorMsg}</span>
			{/if}
		</div>

		<!-- Progress -->
		<div class="mt-8">
			<div class="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
				<div
					class="h-full bg-primary transition-all"
					style="width: {(answeredCount / questions.length) * 100}%"
				></div>
			</div>
			<p class="text-xs text-on-surface-variant mt-2">
				{answeredCount} of {questions.length} answered
			</p>
		</div>

		<!-- Navigation -->
		<div class="flex items-center justify-between pt-8 border-t border-border mt-8">
			<button
				class="px-6 py-2 rounded-lg font-label text-label text-on-surface-variant border border-border hover:bg-surface-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
				disabled={currentIndex === 0}
				onclick={back}
			>
				Back
			</button>

			{#if answeredCount === questions.length}
				<button
					class="px-8 py-2 rounded-lg font-label text-label text-on-primary bg-primary hover:bg-primary-container transition-colors cursor-pointer disabled:opacity-50"
					disabled={advancing}
					onclick={proceed}
				>
					{advancing ? 'Proceeding…' : 'Proceed to Tech Stack'}
				</button>
			{:else}
				<button
					class="px-8 py-2 rounded-lg font-label text-label text-on-primary bg-primary hover:bg-primary-container transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
					disabled={currentIndex === questions.length - 1}
					onclick={next}
				>
					Next
				</button>
			{/if}
		</div>
	</div>
{/if}
