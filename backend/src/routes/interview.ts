import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { interviewService } from '../services/interview.js';
import { projectService, advanceIfNext } from '../services/project.js';
import { isInterviewComplete } from '../domain/interview.js';

export const interviewRouter = new Hono();

interviewRouter.get('/projects/:projectId/interview', async (c) => {
  const projectId = c.req.param('projectId');
  try {
    const project = projectService.getProject(projectId);
    if (project.status === 'idea') advanceIfNext(projectId, 'interview');
  } catch {
    return c.json({ error: 'Project not found' }, 404);
  }
  const answers = await interviewService.generateQuestions(projectId);
  return c.json({ data: answers });
});

interviewRouter.post('/projects/:projectId/interview/generate', async (c) => {
  const projectId = c.req.param('projectId');
  try {
    projectService.getProject(projectId);
  } catch {
    return c.json({ error: 'Project not found' }, 404);
  }
  const answers = await interviewService.generateQuestions(projectId);
  return c.json({ data: answers });
});

const answerSchema = z.object({ answer: z.string() });

interviewRouter.patch(
  '/projects/:projectId/interview/:questionId',
  zValidator('json', answerSchema),
  async (c) => {
    const projectId = c.req.param('projectId');
    const { answer } = c.req.valid('json');
    try {
      const updated = interviewService.saveAnswer(projectId, c.req.param('questionId'), answer);
      return c.json({ data: updated });
    } catch (e) {
      return c.json({ error: (e as Error).message }, 404);
    }
  }
);

interviewRouter.get('/projects/:projectId/interview/next', async (c) => {
  const projectId = c.req.param('projectId');
  try {
    projectService.getProject(projectId);
  } catch {
    return c.json({ error: 'Project not found' }, 404);
  }
  const next = interviewService.getFirstUnanswered(projectId);
  if (!next) return c.json({ data: null, complete: true });
  return c.json({ data: next, complete: false });
});

interviewRouter.post('/projects/:projectId/interview/complete', async (c) => {
  const projectId = c.req.param('projectId');
  const answers = interviewService.getQuestions(projectId);
  if (!isInterviewComplete(answers)) {
    return c.json({ error: 'Interview is not complete yet', complete: false }, 400);
  }
  advanceIfNext(projectId, 'interview');
  const project = advanceIfNext(projectId, 'stack');
  return c.json({ data: project });
});
