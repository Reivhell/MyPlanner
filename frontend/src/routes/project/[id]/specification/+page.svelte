<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import StepLayout from '$lib/components/layouts/StepLayout.svelte';
	import OutOfSyncBanner from '$lib/components/features/graph/OutOfSyncBanner.svelte';
	import Specification from '$lib/components/features/ai-generation/Specification.svelte';

	const id = $derived($page.params.id ?? '');
</script>

<StepLayout projectId={id} step={6}>
	<OutOfSyncBanner projectId={id} stage="specification" />
	<Specification projectId={id} onAdvanced={() => goto(`/project/${id}/tasks`)} />
</StepLayout>
