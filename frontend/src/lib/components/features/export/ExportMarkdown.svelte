<svelte:head>
    <title>Export Markdown - Product Planning OS</title>
</svelte:head>

<script lang="ts">
    let selectedProject = $state('');
    let exportFormat = $state('directory');
    let isExporting = $state(false);
    let exportComplete = $state(false);
    let outputPath = $state('');
    let customPath = $state('');

    let projects = [
        { id: 1, name: 'SonicStream - Music Streaming App', icon: 'music_note' },
        { id: 2, name: 'UrbanGrocery - Online Grocery Delivery', icon: 'shopping_cart' },
        { id: 3, name: 'FitTrack - Workout Journal App', icon: 'fitness_center' }
    ];

    const fileTree = {
        name: 'exports/',
        type: 'folder',
        children: [
            { name: 'AGENTS.md', type: 'file', desc: 'AI agent context' },
            { name: 'CLAUDE.md', type: 'file', desc: 'Claude Code instructions' },
            { name: 'GEMINI.md', type: 'file', desc: 'Gemini context' },
            { name: 'project.json', type: 'file', desc: 'metadata' },
            { name: 'config.json', type: 'file', desc: 'environment' },
            { name: 'prd/', type: 'folder', children: [
                { name: '01-market-overview.md', type: 'file' },
                { name: '02-user-personas.md', type: 'file' },
                { name: '03-feature-requirements.md', type: 'file' }
            ]},
            { name: 'specification/', type: 'folder', children: [
                { name: '01-system-architecture.md', type: 'file' },
                { name: '02-api-endpoints.md', type: 'file' }
            ]},
            { name: 'tasks/', type: 'folder', children: [
                { name: 'sprint-01.md', type: 'file' },
                { name: 'sprint-02.md', type: 'file' }
            ]}
        ]
    };

    let expandedFolders = $state<Set<string>>(new Set(['exports/']));

    let typingText = $state('');
    const fullOutputText = `📂 project-root/
      📄 AGENTS.md
      📄 CLAUDE.md
      📄 GEMINI.md
      📄 manifest.json
      📄 project.json
      📂 prd/
        📄 01-executive-summary.md
        📄 02-market-analysis.md
        📄 03-user-personas.md
      📂 specification/
        📄 01-system-overview.md
        📄 02-module-architecture.md
      📂 tasks/
        📄 sprint-01.md`;

    let typingIndex = $state(0);
    let showOutput = $state(false);

    $effect(() => {
        if (showOutput && typingIndex < fullOutputText.length) {
            const timer = setTimeout(() => {
                typingText += fullOutputText[typingIndex];
                typingIndex++;
            }, 15);
            return () => clearTimeout(timer);
        }
    });

    function toggleFolder(name: string) {
        if (expandedFolders.has(name)) {
            expandedFolders.delete(name);
        } else {
            expandedFolders.add(name);
        }
        expandedFolders = new Set(expandedFolders);
    }

    function handleExport() {
        isExporting = true;
        setTimeout(() => {
            isExporting = false;
            exportComplete = true;
        }, 2000);
    }

    function resetExport() {
        exportComplete = false;
        typingText = '';
        typingIndex = 0;
        showOutput = false;
    }

    function downloadExports() {
        // Placeholder for actual download logic
    }
</script>

<!-- Top Navigation Bar -->
<div class="bg-white border-b border-border px-margin-desktop h-16 flex items-center justify-between shadow-sm">
    <div class="flex items-center space-x-4">
        <div class="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <span class="material-symbols-outlined text-white text-lg">deployed_code</span>
        </div>
        <div>
            <h1 class="font-h2 text-h2 text-on-surface">Export AI Workspace</h1>
            <p class="font-small text-small text-sidebar-muted hidden sm:block">Generate portable AI agent context files</p>
        </div>
    </div>

    <div class="flex items-center space-x-3">
        <div class="bg-surface-muted border border-border rounded-lg px-4 py-2 font-small text-small text-on-surface-variant hidden md:block">
            Step 7 of 8
        </div>
        {#if exportComplete}
            <button onclick={downloadExports} class="bg-primary hover:bg-primary-container text-white px-5 py-2 rounded-lg font-label text-label flex items-center gap-2 transition-all shadow-sm">
                <span class="material-symbols-outlined text-sm">download</span>
                Download Bundle
            </button>
        {:else}
            <button onclick={handleExport} disabled={isExporting || !selectedProject} class="bg-primary text-white px-5 py-2 rounded-lg font-label text-label disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all {isExporting ? 'opacity-70' : 'hover:bg-primary-container'} shadow-sm">
                {#if isExporting}
                    <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Exporting...
                {:else}
                    <span class="material-symbols-outlined text-sm">ios_share</span>
                    Export Now
                {/if}
            </button>
        {/if}
    </div>
</div>

<!-- Main Content -->
<main class="h-[calc(100vh-64px)] overflow-y-auto bg-surface-muted">
    <div class="max-w-[1280px] mx-auto px-margin-desktop py-8 space-y-6">

        <!-- Project Selection -->
        <div class="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-border flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span class="material-symbols-outlined text-primary text-sm">folder</span>
                    </div>
                    <div>
                        <h3 class="font-label text-label text-on-surface">Select Project</h3>
                        <p class="font-small text-small text-sidebar-muted">Choose which project to export</p>
                    </div>
                </div>
                {#if selectedProject}
                    <span class="bg-success/10 text-success font-small text-small px-3 py-1 rounded-full">Ready to Export</span>
                {/if}
            </div>
            <div class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {#each projects as project}
                        <button onclick={() => selectedProject = project.id.toString()}
                                class="text-left p-4 rounded-lg border-2 transition-all {selectedProject === project.id.toString() ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-outline bg-white'}">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center">
                                    <span class="material-symbols-outlined text-primary text-sm">{project.icon}</span>
                                </div>
                                <span class="font-label text-label text-on-surface">{project.name}</span>
                            </div>
                            {#if selectedProject === project.id.toString()}
                                <div class="mt-3 flex items-center gap-1 text-primary font-small text-small">
                                    <span class="material-symbols-outlined text-[14px]">check_circle</span>
                                    Selected
                                </div>
                            {/if}
                        </button>
                    {/each}
                </div>
            </div>
        </div>

        <!-- Export Format -->
        <div class="bg-white rounded-xl border border-border shadow-sm">
            <div class="px-6 py-4 border-b border-border flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span class="material-symbols-outlined text-primary text-sm">category</span>
                </div>
                <div>
                    <h3 class="font-label text-label text-on-surface">Export Format</h3>
                    <p class="font-small text-small text-sidebar-muted">Choose how files should be structured</p>
                </div>
            </div>
            <div class="p-6">
                <div class="flex space-x-4">
                    {#each ['directory', 'flat', 'custom'] as format}
                        <button onclick={() => exportFormat = format}
                                class="flex-1 p-4 rounded-lg border-2 text-center transition-all {exportFormat === format ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-outline'}">
                            <span class="material-symbols-outlined text-2xl text-on-surface block mb-2">
                                {format === 'directory' ? 'folder_open' : format === 'flat' ? 'view_stream' : 'settings'}
                            </span>
                            <span class="font-label text-label text-on-surface capitalize">{format}</span>
                            <p class="font-small text-small text-sidebar-muted mt-1">
                                {format === 'directory' ? 'Standard structure' : format === 'flat' ? 'All in one folder' : 'Manual selection'}
                            </p>
                        </button>
                    {/each}
                </div>
            </div>
        </div>

        <!-- File Tree Preview -->
        <div class="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-border flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span class="material-symbols-outlined text-primary text-sm">account_tree</span>
                    </div>
                    <div>
                        <h3 class="font-label text-label text-on-surface">File Preview</h3>
                        <p class="font-small text-small text-sidebar-muted">Review the export structure before generating</p>
                    </div>
                </div>
                <span class="font-small text-small text-sidebar-muted">Total: 12 files</span>
            </div>
            <div class="p-6">
                {#each [fileTree] as node}
                    <div class="space-y-1 font-mono text-small">
                        {#each node.children as child}
                            <div class="select-none">
                                <button onclick={() => toggleFolder(child.name)}
                                        class="flex items-center gap-2 px-2 py-1 rounded hover:bg-surface-container/50 w-full text-left transition-colors {child.type === 'folder' ? 'font-medium' : ''}">
                                    {#if child.type === 'folder'}
                                        <span class="material-symbols-outlined text-[16px] text-sidebar-muted transition-transform {expandedFolders.has(child.name) ? 'rotate-90' : ''}">chevron_right</span>
                                        <span class="material-symbols-outlined text-[16px] text-warning">folder{expandedFolders.has(child.name) ? '_open' : ''}</span>
                                    {:else}
                                        <span class="w-4"></span>
                                        <span class="material-symbols-outlined text-[16px] text-on-surface-variant">description</span>
                                    {/if}
                                    <span class="text-on-surface">{child.name}</span>
                                    {#if child.desc}
                                        <span class="text-sidebar-muted ml-2">— {child.desc}</span>
                                    {/if}
                                </button>
                                {#if child.type === 'folder' && expandedFolders.has(child.name) && child.children}
                                    <div class="ml-6 border-l border-border pl-2 space-y-1">
                                        {#each child.children as sub}
                                            <button onclick={() => toggleFolder(sub.name)}
                                                    class="flex items-center gap-2 px-2 py-1 rounded hover:bg-surface-container/50 w-full text-left transition-colors">
                                                {#if sub.type === 'folder'}
                                                    <span class="material-symbols-outlined text-[16px] text-sidebar-muted transition-transform {expandedFolders.has(sub.name) ? 'rotate-90' : ''}">chevron_right</span>
                                                    <span class="material-symbols-outlined text-[16px] text-warning">folder{expandedFolders.has(sub.name) ? '_open' : ''}</span>
                                                {:else}
                                                    <span class="w-4"></span>
                                                    <span class="material-symbols-outlined text-[16px] text-on-surface-variant">description</span>
                                                {/if}
                                                <span class="text-on-surface">{sub.name}</span>
                                            </button>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/each}
            </div>
        </div>

        <!-- Terminal Output Preview -->
        {#if showOutput || exportComplete}
            <div class="bg-[#1e1e2e] rounded-xl border border-border shadow-sm overflow-hidden">
                <div class="px-6 py-3 border-b border-white/10 flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-destructive/80"></div>
                    <div class="w-3 h-3 rounded-full bg-warning/80"></div>
                    <div class="w-3 h-3 rounded-full bg-success/80"></div>
                    <span class="font-small text-small text-white/60 ml-2">Terminal — export bundle</span>
                </div>
                <div class="p-6 font-mono text-small text-green-400 whitespace-pre">
                    {typingText}<span class="animate-pulse">|</span>
                </div>
            </div>
        {/if}

        <!-- Bottom Actions -->
        <div class="bg-white rounded-xl border border-border shadow-sm p-6">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <button onclick={resetExport} class="px-4 py-2 rounded-lg border border-border font-label text-label text-on-surface-variant hover:bg-surface-muted transition-colors">
                        Reset
                    </button>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" bind:checked={showOutput} class="rounded border-border text-primary focus:ring-primary" />
                        <span class="font-small text-small text-on-surface-variant">Show terminal preview</span>
                    </label>
                </div>
                <p class="font-small text-small text-sidebar-muted italic">
                    "The output will be bundled into a standard directory structure compatible with Obsidian, VS Code, and GitHub."
                </p>
            </div>
        </div>

        <!-- Helpful Tip Card -->
        <div class="bg-primary-container/10 border border-primary-container/20 rounded-xl p-6 flex gap-4">
            <div class="w-12 h-12 bg-primary rounded-lg flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-white" style="font-variation-settings: 'FILL' 1;">lightbulb</span>
            </div>
            <div>
                <h5 class="font-h2 text-h2 text-primary mb-1">Pro Tip: Sync to Repository</h5>
                <p class="font-body text-body text-on-surface-variant">Instead of a manual download, you can connect your GitHub account in Settings to automatically push these documents as a new repository.</p>
            </div>
        </div>
    </div>
</main>