import { db } from '../db/index.js';
import {
  projects,
  documents,
  tasks,
  graphNodes,
  graphEdges,
  techStacks,
  exports_,
} from '@planner/shared';
import { eq, and } from 'drizzle-orm';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import type { Document, DocumentContent } from '@planner/shared';
import { createZip, type ZipEntry } from '../lib/zip.js';

const EXPORT_VERSION = 1;

function materialize<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function slug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

function serializeDoc(content: DocumentContent): string {
  return Object.entries(content)
    .map(([key, body]) => `## ${key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}\n\n${body.trim()}\n`)
    .join('\n');
}

function buildContextFile(project: any, stack: any, docs: Document[]): string {
  const lines = [`# ${project.name}`, '', '## Overview', project.idea, ''];
  if (project.description) lines.push('', project.description, '');
  lines.push('## Tech Stack');
  lines.push(stack ? Object.entries(stack.components).map(([k, v]) => `- ${k}: ${v}`).join('\n') : '_Not specified_');
  lines.push('', '## Generated Documents');
  if (docs.length === 0) lines.push('_None generated yet_');
  for (const d of docs) lines.push(`- ${d.stage}: ${d.isOutOfSync ? '(out of sync)' : '(up to date)'}`);
  return lines.join('\n');
}

export interface AssembledExport {
  path: string;
  files: string[];
  exportId: string;
}

export const exportService = {
  /** Build the in-memory file set (used for both disk write and zip). */
  buildFiles(projectId: string): { name: string; data: Buffer }[] {
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) throw new Error('Project not found');
    const stack = db.select().from(techStacks).where(eq(techStacks.projectId, projectId)).get();
    const docs = db
      .select()
      .from(documents)
      .where(eq(documents.projectId, projectId))
      .all();
    const nodes = db.select().from(graphNodes).where(eq(graphNodes.projectId, projectId)).all();
    const edges = db.select().from(graphEdges).where(eq(graphEdges.projectId, projectId)).all();
    const taskRows = db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(tasks.order)
      .all();

    const prd = docs.find((d) => d.stage === 'prd');
    const spec = docs.find((d) => d.stage === 'specification');
    const arch = docs.find((d) => d.stage === 'architecture');

    const files: { name: string; data: Buffer }[] = [];

    const root = slug(project.name) + '/';

    // project.json
    files.push({
      name: `${root}project.json`,
      data: Buffer.from(JSON.stringify(materialize(project), null, 2), 'utf8'),
    });

    // graph.json
    files.push({
      name: `${root}graph.json`,
      data: Buffer.from(JSON.stringify({ nodes: materialize(nodes), edges: materialize(edges) }, null, 2), 'utf8'),
    });

    // Agent context files
    const ctx = buildContextFile(project, stack, docs);
    for (const name of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) {
      files.push({ name: `${root}${name}`, data: Buffer.from(ctx, 'utf8') });
    }

    // Modular document folders (only generated sections)
    const writeDocFolder = (stage: string, doc?: Document) => {
      if (!doc) return;
      const content = doc.content as DocumentContent;
      const body = serializeDoc(content);
      files.push({ name: `${root}${stage}/README.md`, data: Buffer.from(`# ${stage.toUpperCase()}\n\n${body}`, 'utf8') });
      Object.entries(content).forEach(([section, text], i) => {
        const idx = String(i + 1).padStart(2, '0');
        files.push({ name: `${root}${stage}/${idx}-${section}.md`, data: Buffer.from(text, 'utf8') });
      });
    };
    writeDocFolder('prd', prd);
    writeDocFolder('specification', spec);
    writeDocFolder('architecture', arch);

    // Tasks folder
    if (taskRows.length > 0) {
      for (const t of taskRows) {
        const md = `# ${t.title}\n\n${t.description}\n\n- Priority: ${t.priority}\n- Group: ${t.group}\n- Status: ${t.status}\n`;
        files.push({
          name: `${root}tasks/${String(t.order).padStart(2, '0')}-${t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`,
          data: Buffer.from(md, 'utf8'),
        });
      }
    }

    // manifest.json
    const manifest = {
      version: EXPORT_VERSION,
      projectId: project.id,
      projectName: project.name,
      exportedAt: new Date().toISOString(),
      files: files.map((f) => ({
        path: f.name,
        size: f.data.length,
        hash: createHash('sha256').update(f.data).digest('hex').slice(0, 16),
      })),
      sections: {
        prd: !!prd,
        specification: !!spec,
        architecture: !!arch,
        tasks: taskRows.length > 0,
      },
    };
    files.push({ name: `${root}manifest.json`, data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8') });

    return files;
  },

  async exportProject(projectId: string): Promise<AssembledExport> {
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) throw new Error('Project not found');
    const prd = db.select().from(documents).where(and(eq(documents.projectId, projectId), eq(documents.stage, 'prd'))).get();
    if (!prd) throw new Error('A generated PRD is required before export (spec §6.4)');

    const files = this.buildFiles(projectId);
    const exportDir = path.join(process.cwd(), 'exports', slug(project.name));
    fs.mkdirSync(exportDir, { recursive: true });
    for (const f of files) {
      const full = path.join(exportDir, f.name);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, f.data);
    }

    const row = db
      .insert(exports_)
      .values({ projectId, path: exportDir })
      .returning()
      .get();

    return {
      path: exportDir,
      files: files.map((f) => f.name),
      exportId: row.id,
    };
  },

  buildZip(projectId: string): Buffer {
    const files = this.buildFiles(projectId);
    const entries: ZipEntry[] = files.map((f) => ({ name: f.name, data: f.data }));
    return createZip(entries);
  },

  listExports(projectId: string) {
    return materialize(
      db.select().from(exports_).where(eq(exports_.projectId, projectId)).orderBy(exports_.createdAt).all()
    );
  },
};
