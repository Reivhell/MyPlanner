<script lang="ts">
	import { page } from '$app/stores';
	import StepLayout from '$lib/components/layouts/StepLayout.svelte';
	import Interview from '$lib/components/features/interview/Interview.svelte';

	const id = $derived($page.params.id ?? '');
</script>

<StepLayout projectId={id} step={2}>
	<Interview projectId={id} />
</StepLayout>
