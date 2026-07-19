import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export class LoginDto extends createZodDto(LoginSchema) {}

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {}

export const RegisterSchema = z.object({
  email: z.email(),
  password: z
    .string()
    .min(8)
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
      'Password must contain uppercase, lowercase and a number',
    ),
});

export class RegisterDto extends createZodDto(RegisterSchema) {}

export const LogoutSchema = z.object({
  refreshToken: z.string(),
});

export class LogoutDto extends createZodDto(LogoutSchema) {}
