import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuid } from 'uuid';
import { Document } from '@langchain/core/documents';
import { RetrievedDocument } from '../types/retrieved-document.type';

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(VectorStoreService.name);

  private readonly client: QdrantClient;

  constructor(private readonly config: ConfigService) {
    this.client = new QdrantClient({
      url: this.config.getOrThrow<string>('qdrant.url'),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureCollection();
  }

  // only for testing purposes, will delete the collection on module destroy
  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.deleteCollection(
        this.config.getOrThrow<string>('qdrant.collection'),
      );

      this.logger.log('Qdrant collection deleted.');
    } catch (error) {
      console.log(error);
      this.logger.warn('Failed to delete Qdrant collection.');
    }
  }

  private handleError(message: string, error: unknown): never {
    this.logger.error(message, error instanceof Error ? error.stack : error);
    throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  private async ensureCollection(): Promise<void> {
    try {
      const collections = await this.client.getCollections();

      const exists = collections.collections.some(
        (collection) =>
          collection.name ===
          this.config.getOrThrow<string>('qdrant.collection'),
      );

      if (exists) {
        return;
      }

      await this.client.createCollection(
        this.config.getOrThrow<string>('qdrant.collection'),
        {
          vectors: {
            size: this.config.getOrThrow<number>('qdrant.vectorSize'),
            distance: 'Cosine',
          },
        },
      );

      this.logger.log(
        `Created collection "${this.config.getOrThrow<string>('qdrant.collection')}" in Qdrant.`,
      );
    } catch (error) {
      this.handleError('Failed to ensure Qdrant collection.', error);
    }
  }

  async upsert(
    vectors: Array<{
      document: Document;
      embedding: number[];
    }>,
  ): Promise<void> {
    try {
      await this.client.upsert(
        this.config.getOrThrow<string>('qdrant.collection'),
        {
          wait: true,
          points: vectors.map(({ document, embedding }) => ({
            id: uuid(),

            vector: embedding,

            payload: {
              text: document.pageContent,
              ...document.metadata,
            },
          })),
        },
      );
    } catch (error) {
      console.log(error);
      this.handleError('Failed to upsert vectors into Qdrant.', error);
    }
  }

  async search(embedding: number[], limit = 5): Promise<RetrievedDocument[]> {
    try {
      const results = await this.client.search(
        this.config.getOrThrow<string>('qdrant.collection'),
        {
          vector: embedding,
          limit,
        },
      );

      return results.map((point): RetrievedDocument => {
        const payload = point.payload as {
          text: string;
          source: string;
          page: number;
        };

        return {
          content: payload.text,
          source: payload.source,
          page: payload.page,
          score: point.score,
          chunkId: point.id as string,
        };
      });
    } catch (error) {
      this.handleError('Failed to search vectors in Qdrant.', error);
    }
  }
}
