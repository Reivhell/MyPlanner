<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';

	interface AppSettings {
		omnirouteUrl: string;
		omnirouteApiKey: string;
		aiMode: 'mock' | 'real';
		aiConcurrency: number;
		n8nWebhookUrl: string;
	}

	let settings = $state<AppSettings>({
		omnirouteUrl: '',
		omnirouteApiKey: '',
		aiMode: 'mock',
		aiConcurrency: 3,
		n8nWebhookUrl: '',
	});
	let loaded = $state(false);
	let saving = $state(false);
	let message = $state<{ kind: 'ok' | 'error'; text: string } | null>(null);

	async function load() {
		try {
			const { data } = await api.get<AppSettings>('/api/settings');
			settings = data;
		} catch (e) {
			message = { kind: 'error', text: (e as Error).message };
		} finally {
			loaded = true;
		}
	}

	async function save() {
		saving = true;
		message = null;
		try {
			await api.put('/api/settings', {
				settings: {
					omnirouteUrl: settings.omnirouteUrl,
					omnirouteApiKey: settings.omnirouteApiKey,
					aiMode: settings.aiMode,
					aiConcurrency: String(settings.aiConcurrency),
					n8nWebhookUrl: settings.n8nWebhookUrl,
				},
			});
			message = { kind: 'ok', text: 'Settings saved.' };
		} catch (e) {
			message = { kind: 'error', text: (e as Error).message };
		} finally {
			saving = false;
		}
	}

	onMount(load);
</script>

<div class="bg-surface-muted text-on-surface antialiased min-h-screen font-body">
	<div class="max-w-2xl mx-auto p-8">
		<h1 class="text-2xl font-semibold mb-1">Settings</h1>
		<p class="text-on-surface-variant mb-6">Configuration is stored locally and applies after save.</p>

		{#if message}
			<div
				class="mb-4 px-4 py-3 rounded-lg text-sm {message.kind === 'ok'
					? 'bg-primary-container text-on-primary-container'
					: 'bg-error-container text-on-error-container'}"
				role="status"
			>
				{message.text}
			</div>
		{/if}

		{#if !loaded}
			<p class="text-on-surface-variant">Loading…</p>
		{:else}
			<div class="space-y-4">
				<label class="block">
					<span class="text-sm font-medium">OmniRoute API URL</span>
					<input
						class="w-full mt-1 bg-surface-container-low border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary"
						type="text"
						bind:value={settings.omnirouteUrl}
						placeholder="https://api.omniroute.ai/v1"
					/>
				</label>

				<label class="block">
					<span class="text-sm font-medium">OmniRoute API Key</span>
					<input
						class="w-full mt-1 bg-surface-container-low border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary"
						type="password"
						bind:value={settings.omnirouteApiKey}
						placeholder="Leave empty to use AI Mode = mock"
					/>
				</label>

				<label class="block">
					<span class="text-sm font-medium">AI Mode</span>
					<select
						class="w-full mt-1 bg-surface-container-low border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary appearance-none"
						bind:value={settings.aiMode}
					>
						<option value="mock">Mock</option>
						<option value="real">Real (calls OmniRoute)</option>
					</select>
				</label>

				<label class="block">
					<span class="text-sm font-medium">AI Concurrency</span>
					<input
						class="w-full mt-1 bg-surface-container-low border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary"
						type="number"
						min="1"
						bind:value={settings.aiConcurrency}
					/>
				</label>

				<label class="block">
					<span class="text-sm font-medium">n8n Webhook URL</span>
					<input
						class="w-full mt-1 bg-surface-container-low border border-border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary"
						type="text"
						bind:value={settings.n8nWebhookUrl}
					/>
				</label>

				<div class="pt-2">
					<button
						class="px-5 py-2.5 rounded-lg bg-primary text-on-primary font-medium disabled:opacity-50"
						onclick={save}
						disabled={saving}
					>
						{saving ? 'Saving…' : 'Save'}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
