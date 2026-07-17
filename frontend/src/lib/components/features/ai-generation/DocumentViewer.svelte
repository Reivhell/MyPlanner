<script lang="ts">
	import type { DocumentContent } from '@planner/shared';

	let { content }: { content?: DocumentContent | null } = $props();

	// Minimal, dependency-free markdown → HTML. Covers headings, bold,
	// inline code, lists, paragraphs. Escapes HTML to avoid injection.
	function esc(s: string): string {
		return s
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
	}

	function render(md: string): string {
		const lines = esc(md).split('\n');
		const out: string[] = [];
		let inList = false;
		const closeList = () => {
			if (inList) {
				out.push('</ul>');
				inList = false;
			}
		};
		const inline = (t: string) =>
			t
				.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
				.replace(/`([^`]+?)`/g, '<code>$1</code>');

		for (const raw of lines) {
			const line = raw.trimEnd();
			const h = /^(#{1,6})\s+(.*)$/.exec(line);
			const li = /^[-*]\s+(.*)$/.exec(line);
			if (h) {
				closeList();
				const level = h[1].length;
				out.push(`<h${level}>${inline(h[2])}</h${level}>`);
			} else if (li) {
				if (!inList) {
					out.push('<ul>');
					inList = true;
				}
				out.push(`<li>${inline(li[1])}</li>`);
			} else if (line === '') {
				closeList();
			} else {
				closeList();
				out.push(`<p>${inline(line)}</p>`);
			}
		}
		closeList();
		return out.join('\n');
	}

	const sections = $derived(
		content ? Object.entries(content).filter(([, v]) => v && v.trim()) : []
	);
</script>

{#if sections.length === 0}
	<p class="text-on-surface-variant text-sm italic">No content yet.</p>
{:else}
	<div class="markdown-preview space-y-4">
		{#each sections as [key, value]}
			<section class="border border-border rounded-lg p-4">
				<div class="text-xs uppercase tracking-wide text-on-surface-variant mb-2">{key.replace(/_/g, ' ')}</div>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html render(value)}
			</section>
		{/each}
	</div>
{/if}
