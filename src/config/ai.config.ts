import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  defaultProvider: 'gemini',

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
