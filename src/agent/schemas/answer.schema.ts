import { z } from 'zod';

export const AnswerSchema = z.object({
  answer: z.string(),
  confidence: z.number().min(0).max(1),
});

export type Answer = z.infer<typeof AnswerSchema>;
