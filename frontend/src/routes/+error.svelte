<script lang="ts">
	import { page } from '$app/stores';

	const category = $derived.by(() => {
		const status = $page.status;
		if (status === 0 || status >= 500) return 'server';
		if (status === 401 || status === 403) return 'auth';
		if (status === 429) return 'rate_limit';
		if (status === 404) return 'not_found';
		return 'unknown';
	});

	const copy = $derived(
		({
			server: 'Something went wrong on the server. Try again shortly.',
			auth: 'This action is not authorized.',
			rate_limit: 'Too many requests. Please wait a moment and retry.',
			not_found: 'The page you were looking for was not found.',
			unknown: 'An unexpected error occurred.',
		})[category]
	);
</script>

<div class="min-h-screen flex items-center justify-center bg-surface-muted text-on-surface font-body p-8">
	<div class="max-w-md w-full text-center">
		<div class="text-sm font-medium text-on-surface-variant mb-2">
			{$page.status || 'Error'}
		</div>
		<h1 class="text-xl font-semibold mb-2">{copy}</h1>
		<p class="text-sm text-on-surface-variant mb-6">{$page.error?.message}</p>
		<a href="/" class="inline-block px-5 py-2.5 rounded-lg bg-primary text-on-primary font-medium">
			Back to Home
		</a>
	</div>
</div>
