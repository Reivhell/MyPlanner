import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { projectRouter } from './routes/project.js';
import { interviewRouter } from './routes/interview.js';
import { techStackRouter } from './routes/tech-stack.js';
import { graphRouter } from './routes/graph.js';
import { aiRouter } from './routes/ai.js';
import { exportRouter } from './routes/export.js';
import { settingsRouter } from './routes/settings.js';
import { syncRouter } from './routes/sync.js';

const app = new Hono();

// --- Middleware ---
app.use('*', cors({ origin: '*' }));
app.use('*', logger());
app.use('*', prettyJSON());

// --- Health ---
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// --- Routes ---
app.route('/api', projectRouter);
app.route('/api', interviewRouter);
app.route('/api', techStackRouter);
app.route('/api', graphRouter);
app.route('/api', aiRouter);
app.route('/api', exportRouter);
app.route('/api', settingsRouter);
app.route('/api', syncRouter);

// --- Start ---
const PORT = parseInt(process.env.PORT || '3001', 10);

if (process.env.NODE_ENV !== 'test') {
  serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`🚀 Backend running at http://localhost:${info.port}`);
  });
}

export default app;
