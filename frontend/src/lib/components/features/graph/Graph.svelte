<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import go from 'gojs';
	import { api } from '$lib/api';
	import type { GraphNode, GraphEdge } from '@planner/shared';

	let { projectId }: { projectId: string } = $props();

	const NODE_TYPES = ['feature', 'module', 'dependency', 'screen', 'component'] as const;

	// Reactive UI state (ponytail: was previously plain `let`, breaking Svelte 5 reactivity).
	let loading = $state(true);
	let error = $state('');
	let saveState = $state<'saved' | 'saving' | 'unsaved'>('saved');
	let selectedNode = $state<GraphNode | null>(null);
	let nodeLabel = $state('');
	let nodeType = $state<string>('feature');

	let diagram: go.Diagram | null = null;
	let container: HTMLDivElement;
	let persistTimer: ReturnType<typeof setTimeout> | null = null;

	function debouncedPersist(fn: () => void, ms = 400) {
		if (persistTimer) clearTimeout(persistTimer);
		persistTimer = setTimeout(fn, ms);
	}

	// Map DB node -> GoJS model data.
	function toModelData(n: GraphNode) {
		return { key: n.id, label: n.label, type: n.type, loc: `${(n.x ?? 0).toString()} ${(n.y ?? 0).toString()}` };
	}
	function toEdgeData(e: GraphEdge) {
		return { key: e.id, from: e.sourceId, to: e.targetId };
	}

	async function loadGraph() {
		loading = true;
		error = '';
		try {
			const { data } = await api.get<{ nodes: GraphNode[]; edges: GraphEdge[] }>(
				`/projects/${projectId}/graph`
			);
			if (diagram) {
				diagram.model.commit((m) => {
					(m as go.GraphLinksModel).mergeNodeDataArray(data.nodes.map(toModelData));
					(m as go.GraphLinksModel).mergeLinkDataArray(data.edges.map(toEdgeData));
				}, null);
			}
			loading = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load graph';
			loading = false;
		}
	}

	function buildDiagram() {
		const make = go.GraphObject.make;
		const d = new go.Diagram(container, {
			'undoManager.isEnabled': true,
			'undoManager.maxHistoryLength': 200,
			initialAutoScale: go.Diagram.Uniform,
			contentAlignment: go.Spot.Center,
			layout: make(go.LayeredDigraphLayout, {
				angle: 0, // left -> right
				layerSpacing: 80,
				nodeSpacing: 30,
			}),
			'ModelChanged': (e: unknown) => {
				// Persist structural / positional changes (not selection/txstate noise).
				const ev = e as { isTransactionFinished: boolean; propertyName: string };
				if (ev.isTransactionFinished && diagram) {
					const prop = ev.propertyName;
					if (prop === 'CommittedGraphLinks' || prop === 'CommittedPart' || prop === 'nodeDataArray') {
						persistDiagram();
					}
				}
			},
			'ChangedSelection': () => {
				const sel = diagram?.selection.first();
				if (sel instanceof go.Node) {
					const data = sel.data as { key: string; label: string; type: string };
					selectedNode = data.key ? { id: data.key, projectId, label: data.label, type: data.type, x: 0, y: 0 } : null;
					nodeLabel = data.label ?? '';
					nodeType = data.type ?? 'feature';
				} else {
					selectedNode = null;
				}
			},
		});
		d.nodeTemplate = make(
			go.Node,
			'Auto',
			{ locationSpot: go.Spot.Center },
			new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
			make(
				go.Shape,
				'RoundedRectangle',
				{ strokeWidth: 1.5, portId: '', fromLinkable: true, toLinkable: true, cursor: 'pointer' },
				new go.Binding('fill', 'type', (t: string) => NODE_FILL[t] ?? '#e0e0e0'),
				new go.Binding('stroke', 'type', (t: string) => NODE_STROKE[t] ?? '#9e9e9e')
			),
			make(
				go.TextBlock,
				{ margin: 8, font: '13px sans-serif', editable: true, stroke: '#1f1f1f' },
				new go.Binding('text', 'label').makeTwoWay()
			)
		);
		d.linkTemplate = make(
			go.Link,
			{ routing: go.Routing.AvoidsNodes, corner: 8, relinkableFrom: true, relinkableTo: true, toShortLength: 4 },
			make(go.Shape, { strokeWidth: 1.5, stroke: '#888' }),
			make(go.Shape, { toArrow: 'Standard', stroke: '#888', fill: '#888' })
		);
		d.model = new go.GraphLinksModel([], []);
		d.model.nodeKeyProperty = 'key';

		// Double-click a node -> inline rename (GoJS editable textblock).
		d.addDiagramListener('ObjectDoubleClicked', (e: unknown) => {
			const ev = e as { subject: { part: go.GraphObject } };
			const part = ev.subject.part;
			if (part instanceof go.Node) {
				const editable = part.findObject('');
				if (editable) (d as any).commandHandler.editTextBlock(editable as go.TextBlock);
			}
		});

		// Delete key removes selection (node cascades edges server-side).
		d.commandHandler.canDeleteSelection = () => true;
		return d;
	}

	const NODE_FILL: Record<string, string> = {
		feature: '#e8f0fe',
		module: '#e6f4ea',
		dependency: '#fce8e6',
		screen: '#fef7e0',
		component: '#f3e8fd',
	};
	const NODE_STROKE: Record<string, string> = {
		feature: '#4285f4',
		module: '#34a853',
		dependency: '#ea4335',
		screen: '#fbbc04',
		component: '#a142f4',
	};

	function persistDiagram() {
		if (!diagram) return;
		saveState = 'saving';
		const nodes = (diagram.model.nodeDataArray as Array<{ key: string; label: string; type: string; loc: string }>).map(
			(n) => {
				const [x, y] = (n.loc ?? '0 0').split(' ').map(Number);
				return { id: n.key, label: n.label, type: n.type, x: x ?? 0, y: y ?? 0 };
			}
		);
		const edges = (diagram.model as go.GraphLinksModel).linkDataArray as Array<{ from: string; to: string }>;

		debouncedPersist(async () => {
			try {
				await api.post(`/projects/${projectId}/graph/sync`, { nodes, edges });
				saveState = 'saved';
			} catch {
				saveState = 'unsaved';
			}
		});
	}

	async function addNode() {
		if (!diagram) return;
		saveState = 'saving';
		try {
			const spot = diagram.viewportBounds.center;
			const x = Math.round(spot.x);
			const y = Math.round(spot.y);
			const { data } = await api.post<GraphNode>(`/projects/${projectId}/graph/nodes`, {
				label: 'New Node',
				type: 'feature',
				x,
				y,
			});
			diagram.model.commit((m) => {
				(m as go.GraphLinksModel).addNodeData(toModelData(data));
			}, null);
			saveState = 'saved';
		} catch {
			saveState = 'unsaved';
		}
	}

	async function deleteSelected() {
		if (!diagram) return;
		const sel = diagram.selection.first();
		if (!sel) return;
		const key = (sel.data as { key: string }).key;
		try {
			if (sel instanceof go.Node) {
				await api.delete(`/projects/${projectId}/graph/nodes/${key}`);
			} else if (sel instanceof go.Link) {
				const linkKey = (sel.data as { key: string }).key;
				await api.delete(`/projects/${projectId}/graph/edges/${linkKey}`);
			}
			diagram.commit((d) => d.remove(sel), null);
			saveState = 'saved';
		} catch {
			saveState = 'unsaved';
		}
	}

	async function autoLayout() {
		if (!diagram) return;
		saveState = 'saving';
		try {
			const { data } = await api.post<{ nodes: GraphNode[]; edges: GraphEdge[] }>(
				`/projects/${projectId}/graph/auto-layout`,
				{}
			);
			diagram.model.commit((m) => {
				(m as go.GraphLinksModel).mergeNodeDataArray(data.nodes.map(toModelData));
			}, null);
			saveState = 'saved';
		} catch {
			saveState = 'unsaved';
		}
	}

	// Inspector edits -> persist.
	function updateSelectedLabel() {
		if (!diagram || !selectedNode) return;
		const model = diagram.model;
		model.commit((m) => {
			const d = m.findNodeDataForKey(selectedNode!.id);
			if (d) m.set(d, 'label', nodeLabel);
		}, null);
		persistDiagram();
	}
	function updateSelectedType() {
		if (!diagram || !selectedNode) return;
		const model = diagram.model;
		model.commit((m) => {
			const d = m.findNodeDataForKey(selectedNode!.id);
			if (d) m.set(d, 'type', nodeType);
		}, null);
		persistDiagram();
	}

	function undo() {
		diagram?.commandHandler.undo();
		persistDiagram();
	}
	function redo() {
		diagram?.commandHandler.redo();
		persistDiagram();
	}

	onMount(async () => {
		diagram = buildDiagram();
		// Keyboard: Del deletes selection.
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Delete' && document.activeElement === container) deleteSelected();
		};
		window.addEventListener('keydown', onKey);
		await loadGraph();
		if (container) (container as unknown as { _keyHandler?: (e: KeyboardEvent) => void })._keyHandler = onKey;
	});

	onDestroy(() => {
		const handler = (container as unknown as { _keyHandler?: (e: KeyboardEvent) => void })._keyHandler;
		if (handler) window.removeEventListener('keydown', handler);
		if (persistTimer) clearTimeout(persistTimer);
		diagram?.div?.remove();
		diagram = null;
	});

	// Empty state: show Add Node affordance when no nodes.
	let isEmpty = $derived.by(
		() => diagram !== null && (diagram.model as go.GraphLinksModel).nodeDataArray.length === 0 && !loading
	);
</script>

<div class="relative w-full h-[calc(100vh-8rem)] bg-surface border border-border rounded-xl overflow-hidden">
	<!-- Toolbar -->
	<div class="absolute top-3 left-3 z-10 flex items-center gap-2 bg-surface-muted/90 border border-border rounded-lg p-1.5 shadow-sm">
		<button
			class="px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90"
			onclick={addNode}
		>
			+ Node
		</button>
		<button
			class="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-surface-muted"
			onclick={autoLayout}
		>
			Auto Layout
		</button>
		<button
			class="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-surface-muted"
			onclick={undo}
			title="Undo (Ctrl+Z)"
		>
			Undo
		</button>
		<button
			class="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-surface-muted"
			onclick={redo}
			title="Redo (Ctrl+Y)"
		>
			Redo
		</button>
		<button
			class="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-surface-muted"
			onclick={deleteSelected}
		>
			Delete
		</button>
	</div>

	<!-- Sync indicator -->
	<div class="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-surface-muted/90 border border-border rounded-lg px-3 py-1.5 text-xs">
		<span
			class="w-2 h-2 rounded-full {saveState === 'saved' ? 'bg-primary' : saveState === 'saving' ? 'bg-warning' : 'bg-error'}"
		></span>
		{saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : 'Unsaved'}
	</div>

	<!-- Canvas -->
	<div
		bind:this={container}
		class="w-full h-full outline-none"
		role="application"
		aria-label="Planning graph canvas"
	></div>

	{#if loading}
		<div class="absolute inset-0 flex items-center justify-center bg-surface/60">
			<div class="animate-pulse text-on-surface-variant text-sm">Loading graph…</div>
		</div>
	{/if}

	{#if error}
		<div class="absolute bottom-3 left-3 right-3 z-10 rounded-lg border border-error-container bg-error-container/10 p-3 text-sm text-error">
			{error}
		</div>
	{/if}

	{#if isEmpty}
		<div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
			<p class="text-on-surface-variant text-sm mb-3">Start building — add nodes</p>
			<button
				class="pointer-events-auto px-4 py-2 rounded-lg bg-primary text-white text-sm hover:opacity-90"
				onclick={addNode}
			>
				+ Add Node
			</button>
		</div>
	{/if}

	<!-- Inspector -->
	{#if selectedNode}
		<div class="absolute bottom-3 right-3 z-10 w-64 bg-surface-muted/95 border border-border rounded-lg p-3 shadow-sm">
			<label for="node-label" class="block text-xs text-on-surface-variant mb-1">Label</label>
			<input
				id="node-label"
				class="w-full rounded-md border border-border px-2 py-1.5 text-sm bg-surface"
				bind:value={nodeLabel}
				oninput={updateSelectedLabel}
			/>
			<label for="node-type" class="block text-xs text-on-surface-variant mt-2 mb-1">Type</label>
			<select
				id="node-type"
				class="w-full rounded-md border border-border px-2 py-1.5 text-sm bg-surface"
				bind:value={nodeType}
				onchange={updateSelectedType}
			>
				{#each NODE_TYPES as t}
					<option value={t}>{t}</option>
				{/each}
			</select>
		</div>
	{/if}
</div>
