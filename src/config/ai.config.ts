import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  defaultProvider: 'gemini',
  requestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 30000),

  gemini: {
    apiKey: process.env.GEMINI_API_KEY!,
    model: process.env.GEMINI_MODEL,
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL,
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY!,
    model: process.env.GROQ_MODEL,
  },
}));
