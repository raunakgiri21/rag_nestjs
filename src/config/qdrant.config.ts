import { registerAs } from '@nestjs/config';

export default registerAs('qdrant', () => ({
  url: process.env.QDRANT_URL,
  collection: process.env.QDRANT_COLLECTION ?? 'documents',
  vectorSize: parseInt(process.env.VECTOR_SIZE ?? '3072', 10),
}));
