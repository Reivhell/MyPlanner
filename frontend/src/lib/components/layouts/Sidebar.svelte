<script lang="ts">
	import { goto } from '$app/navigation';

	let { active = 'home' }: { active?: string } = $props();
</script>

<aside class="fixed h-full w-64 left-0 top-0 bg-sidebar-bg flex flex-col p-4 border-r border-outline-variant z-50">
	<div class="flex items-center gap-3 mb-6 px-2">
		<div class="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm">
			P
		</div>
		<span class="font-semibold text-sm text-white">Product Planner</span>
	</div>

	<nav class="flex-1 space-y-1">
		<button
			class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer {active === 'home' ? 'bg-primary-container/20 text-primary-fixed' : 'text-sidebar-muted hover:bg-sidebar-hover/30 hover:text-white'}"
			onclick={() => goto('/')}
		>
			<span class="text-lg">🏠</span>
			<span>Home</span>
		</button>

		<button
			class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer {active === 'settings' ? 'bg-primary-container/20 text-primary-fixed' : 'text-sidebar-muted hover:bg-sidebar-hover/30 hover:text-white'}"
			onclick={() => goto('/settings')}
		>
			<span class="text-lg">⚙️</span>
			<span>Settings</span>
		</button>
	</nav>

	<div class="mt-auto pt-4 border-t border-outline-variant/30 px-2">
		<div class="flex items-center gap-3">
			<div class="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-xs">
				S
			</div>
			<div>
				<div class="text-xs text-white leading-none">Sajal</div>
				<div class="text-xs text-sidebar-muted mt-1">Local Workspace</div>
			</div>
		</div>
	</div>
</aside>