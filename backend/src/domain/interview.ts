import type { InterviewAnswer } from '@planner/shared';

/** True when every seeded question has a substantive answer. */
export function isInterviewComplete(answers: InterviewAnswer[]): boolean {
  if (answers.length === 0) return false;
  return answers.every((a) => a.answer.trim().length >= 3);
}

/** Index of first unanswered question, or -1 if all answered. */
export function firstUnansweredIndex(answers: InterviewAnswer[]): number {
  return answers.findIndex((a) => !a.answer || a.answer.trim().length < 3);
}
