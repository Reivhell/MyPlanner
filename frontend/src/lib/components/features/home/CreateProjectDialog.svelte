<script lang="ts">
	let { onclose, oncreated }: { onclose: () => void; oncreated: () => void } = $props();

	import { api } from '$lib/api';

	let name = $state('');
	let idea = $state('');
	let description = $state('');
	let saving = $state(false);
	let error = $state('');
	let touched = $state(false);

	function valid(): boolean {
		return name.trim().length > 0 && idea.trim().length > 0;
	}

	async function submit() {
		touched = true;
		if (!valid()) return;
		saving = true;
		error = '';
		try {
			await api.post<unknown>('/api/projects', {
				name: name.trim(),
				idea: idea.trim(),
				description: description.trim() || undefined,
			});
			oncreated();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong';
		} finally {
			saving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !saving) onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- backdrop -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
	onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}
>
	<div
		class="w-full max-w-lg mx-4 rounded-xl border border-border bg-surface p-6 shadow-lg"
		role="dialog"
		aria-modal="true"
		aria-label="Create new project"
	>
		<h2 class="text-lg font-semibold text-on-surface mb-4">New Project</h2>

		<form onsubmit={(e) => { e.preventDefault(); submit(); }} class="space-y-4">
			<div>
				<label for="name" class="block text-sm font-medium text-on-surface mb-1">
					Project name <span class="text-error">*</span>
				</label>
				<input
					id="name"
					type="text"
					bind:value={name}
					placeholder="e.g. Spotify Clone"
					class="w-full rounded-lg border {touched && !name.trim() ? 'border-error' : 'border-border'} bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
					required
				/>
				{#if touched && !name.trim()}
					<p class="text-xs text-error mt-1">Name is required</p>
				{/if}
			</div>

			<div>
				<label for="idea" class="block text-sm font-medium text-on-surface mb-1">
					Product idea <span class="text-error">*</span>
				</label>
				<textarea
					id="idea"
					bind:value={idea}
					placeholder="Describe your product idea in a few sentences…"
					rows="4"
					class="w-full rounded-lg border {touched && !idea.trim() ? 'border-error' : 'border-border'} bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
					required
				></textarea>
				{#if touched && !idea.trim()}
					<p class="text-xs text-error mt-1">Product idea is required</p>
				{/if}
			</div>

			<div>
				<label for="desc" class="block text-sm font-medium text-on-surface mb-1">
					Description <span class="text-on-surface-variant/50">(optional)</span>
				</label>
				<input
					id="desc"
					type="text"
					bind:value={description}
					placeholder="Brief description"
					class="w-full rounded-lg border border-border bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
				/>
			</div>

			{#if error}
				<div class="rounded-lg bg-error-container/10 border border-error-container p-3">
					<p class="text-sm text-error">{error}</p>
				</div>
			{/if}

			<div class="flex items-center justify-end gap-3 pt-1">
				<button
					type="button"
					class="px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
					onclick={onclose}
					disabled={saving}
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={saving || !valid()}
					class="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-on-primary hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
				>
					{saving ? 'Creating…' : 'Create Project'}
				</button>
			</div>
		</form>
	</div>
</div>
