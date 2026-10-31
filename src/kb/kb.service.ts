import { Injectable, NotFoundException } from '@nestjs/common';
import { IngestionService } from './services/ingestion/ingestion.service';
import { RetrieverService } from './services/retriever/retriever.service';
import { IngestFile } from './types/ingest-file.type';
import { PrismaService } from 'src/prisma/prisma.service';
import { VectorStoreService } from './vector-store/vector-store.service';
import { FileStorageService } from 'src/storage/file-storage.service';

@Injectable()
export class KbService {
  constructor(
    private readonly retriever: RetrieverService,
    private readonly ingestion: IngestionService,
    private readonly prismaService: PrismaService,
    private readonly vectorStore: VectorStoreService,
    private readonly fileStorage: FileStorageService,
  ) {}

  retrieve(query: string, limit: number = 5, userId: string) {
    return this.retriever.retrieve(query, limit, userId);
  }

  ingest(file: IngestFile, userId: string) {
    return this.ingestion.ingest(file, userId);
  }

  getAllDocumentsByUser(userId: string) {
    return this.prismaService.document.findMany({
      where: { userId, status: 'READY' },
    });
  }

  // Retrieve original PDF for preview.
  async getDocumentPreview(documentId: string, userId: string) {
    const document = await this.prismaService.document.findFirst({
      where: {
        id: documentId,
        userId,
        status: 'READY',
      },
    });

    if (!document || !document.storageKey) {
      throw new NotFoundException('Document not found.');
    }

    const file = await this.fileStorage.get(document.storageKey);

    if (!file.Body) {
      throw new NotFoundException('PDF file not found in storage.');
    }

    const bytes = await file.Body.transformToByteArray();
    const buffer = Buffer.from(bytes);

    return {
      body: buffer,
      fileName: document.fileName,
    };
  }

  // Delete document, its vectors, and its original file.
  async deleteDocumentById(documentId: string, userId: string) {
    const document = await this.prismaService.document.findFirst({
      where: {
        id: documentId,
        userId,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found.');
    }

    // Delete vectors from Qdrant.
    await this.vectorStore.deleteChunksByDocumentId(documentId);

    // Delete original PDF from SeaweedFS, if it exists.
    if (document.storageKey) {
      await this.fileStorage.delete(document.storageKey);
    }

    // Delete database record.
    await this.prismaService.document.delete({
      where: { id: documentId },
    });

    return {
      deleted: true,
      message: 'Document deleted successfully.',
    };
  }
}
