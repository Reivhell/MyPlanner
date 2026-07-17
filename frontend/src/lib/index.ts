// Public component API (imported via the `$lib` alias).
// Layout primitives live in `components/layouts`; feature screens live in
// `components/features/<domain>`. Keep this barrel in sync when adding
// screens so consumers import from one place (architecture.md: Presentation
// layer should not reach into implementation folders directly).

export { default as Sidebar } from './components/layouts/Sidebar.svelte';
export { default as Stepper } from './components/layouts/Stepper.svelte';

export { default as Dashboard } from './components/features/home/Dashboard.svelte';
export { default as CreateProjectDialog } from './components/features/home/CreateProjectDialog.svelte';
export { default as Interview } from './components/features/interview/Interview.svelte';
export { default as TechStackManual } from './components/features/tech-stack/TechStackManual.svelte';
export { default as TechStackRecommendation } from './components/features/tech-stack/TechStackRecommendation.svelte';
export { default as TechStackPath } from './components/features/tech-stack/TechStackPath.svelte';
export { default as Graph } from './components/features/graph/Graph.svelte';
export { default as Prd } from './components/features/ai-generation/Prd.svelte';
export { default as Specification } from './components/features/ai-generation/Specification.svelte';
export { default as Tasks } from './components/features/ai-generation/Tasks.svelte';
export { default as ExportMarkdown } from './components/features/export/ExportMarkdown.svelte';
