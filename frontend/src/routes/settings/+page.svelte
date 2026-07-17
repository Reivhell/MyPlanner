<script lang="ts">
	import Settings from '$lib/components/features/settings/Settings.svelte';
	import Sidebar from '$lib/components/layouts/Sidebar.svelte';
</script>

<Sidebar active="settings" />
<main class="ml-64">
	<Settings />
</main>
