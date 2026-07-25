import { Injectable } from '@nestjs/common';
import { IngestionService } from './services/ingestion/ingestion.service';
import { RetrieverService } from './services/retriever/retriever.service';
import { IngestFile } from './types/ingest-file.type';
import { PrismaService } from 'src/prisma/prisma.service';
import { VectorStoreService } from './vector-store/vector-store.service';

@Injectable()
export class KbService {
  constructor(
    private readonly retriever: RetrieverService,
    private readonly ingestion: IngestionService,
    private readonly prismaService: PrismaService,
    private readonly vectorStore: VectorStoreService,
  ) {}

  retrieve(query: string, limit: number = 5) {
    return this.retriever.retrieve(query, limit);
  }

  ingest(file: IngestFile) {
    return this.ingestion.ingest(file);
  }

  getAllDocumentsByUser(userId: string) {
    return this.prismaService.document.findMany({
      where: { userId, status: 'READY' },
    });
  }

  async deleteDocumentById(documentId: string) {
    try {
      const res = await this.vectorStore.deleteChunksByDocumentId(documentId);
      if (res.deleted) {
        const docExists = await this.prismaService.document.findUnique({
          where: { id: documentId },
        });
        if (!docExists) {
          throw new Error(`Document with ID ${documentId} does not exist.`);
        }
        await this.prismaService.document.delete({
          where: { id: documentId },
        });
      }
      return {
        deleted: res.deleted,
        message: res.message,
      };
    } catch (error) {
      console.log(error);
      throw new Error(`Failed to delete document with ID ${documentId}`);
    }
  }
}
