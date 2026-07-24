import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AskSchema = z.object({
  question: z.string().trim().min(1, 'Question is required').max(2000),
});

export class AskDto extends createZodDto(AskSchema) {}
