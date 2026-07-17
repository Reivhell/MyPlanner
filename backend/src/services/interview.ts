import { db } from '../db/index.js';
import { interviewAnswers } from '@planner/shared';
import { eq, and, asc } from 'drizzle-orm';
import type { InterviewAnswer } from '@planner/shared';

const DEFAULT_QUESTIONS = [
  'What is the biggest problem this product solves?',
  'Who is the target user?',
  'What are the core features?',
  'What platforms will this run on?',
  'What is your timeline?',
  'What existing solutions or competitors exist?',
  'How will this make money (if at all)?',
  'What are the key technical constraints?',
];

function materialize<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export const interviewService = {
  getQuestions(projectId: string): InterviewAnswer[] {
    return materialize(
      db
        .select()
        .from(interviewAnswers)
        .where(eq(interviewAnswers.projectId, projectId))
        .orderBy(asc(interviewAnswers.order))
        .all()
    );
  },

  /**
   * Seed default questions for a project. Skeleton for Batch 6: the real
   * implementation generates project-specific questions via OmniRoute.
   * Idempotent — if questions already exist, the existing set is returned
   * unchanged.
   */
  async generateQuestions(projectId: string): Promise<InterviewAnswer[]> {
    const existing = this.getQuestions(projectId);
    if (existing.length > 0) return existing;
    for (let i = 0; i < DEFAULT_QUESTIONS.length; i++) {
      db.insert(interviewAnswers)
        .values({ projectId, question: DEFAULT_QUESTIONS[i], answer: '', order: i })
        .run();
    }
    return this.getQuestions(projectId);
  },

  /** Upsert a single answer by its question id (answer row id). */
  saveAnswer(projectId: string, answerId: string, answer: string): InterviewAnswer {
    const target = db
      .select()
      .from(interviewAnswers)
      .where(and(eq(interviewAnswers.id, answerId), eq(interviewAnswers.projectId, projectId)))
      .get();
    if (!target) throw new Error('Answer not found');
    const row = db
      .update(interviewAnswers)
      .set({ answer })
      .where(eq(interviewAnswers.id, answerId))
      .returning()
      .get();
    return materialize(row);
  },

  /** First question still missing a substantive answer, or null if all done. */
  getFirstUnanswered(projectId: string): InterviewAnswer | null {
    const questions = this.getQuestions(projectId);
    const idx = questions.findIndex((a) => !a.answer || a.answer.trim().length < 3);
    return idx === -1 ? null : questions[idx];
  },

  /** Wipe and re-seed a project's answers (used to restart the interview). */
  async resetAnswers(projectId: string): Promise<InterviewAnswer[]> {
    db.delete(interviewAnswers).where(eq(interviewAnswers.projectId, projectId)).run();
    return this.generateQuestions(projectId);
  },
};
