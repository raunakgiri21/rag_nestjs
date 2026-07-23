import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RetrieveSchema = z.object({
  query: z.string().trim().min(1).max(1000),
  limit: z.number().int().positive().max(20).default(5).optional(),
});

export class RetrieveDto extends createZodDto(RetrieveSchema) {}
