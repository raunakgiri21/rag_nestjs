import { z } from 'zod';

export const JwtPayloadSchema = z.object({
  sub: z.uuid(),
  email: z.email(),
  role: z.enum(['USER', 'ADMIN']),
});

export type JwtPayloadType = z.infer<typeof JwtPayloadSchema>;
