import { BadRequestException, Injectable } from '@nestjs/common';

import { PdfLoaderService } from '../../loaders/pdf-loader.service';
import { IngestFile } from '../../types/ingest-file.type';
import { Document } from '@langchain/core/documents';
import { TextSplitterService } from 'src/kb/splitters/text-splitter.service';
import { EmbeddingsService } from 'src/kb/embeddings/embeddings.service';
import { PlainTextLoaderService } from 'src/kb/loaders/text-loader.service';
import { VectorStoreService } from 'src/kb/vector-store/vector-store.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { dbDocType } from 'src/kb/types/db-doc.type';

@Injectable()
export class IngestionService {
  constructor(
    private readonly pdfLoader: PdfLoaderService,
    private readonly plaintextLoader: PlainTextLoaderService,
    private readonly textSplitter: TextSplitterService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly vectorStore: VectorStoreService,
    private readonly prisma: PrismaService,
  ) {}

  async ingest(
    file: IngestFile,
    userId: string = 'test-user',
  ): Promise<{ message: string; chunks: number }> {
    let documentId: string = '';
    try {
      let documents: Document[] = [];

      const doc: dbDocType | null = await this.prisma.document.findFirst({
        where: {
          fileName: file.originalName,
          status: 'READY',
        },
      });

      if (doc) {
        throw new BadRequestException(
          `Document with name ${file.originalName} already exists.`,
        );
      }

      const newDoc: dbDocType = await this.prisma.document.create({
        data: {
          userId: userId,
          fileName: file.originalName,
          status: 'PENDING',
          createdAt: new Date(),
        },
      });

      documentId = newDoc.id;

      switch (file.mimeType) {
        case 'application/pdf':
          documents = await this.pdfLoader.load(file);
          break;
        case 'text/plain':
          documents = await this.plaintextLoader.load(file);
          break;
        default:
          throw new BadRequestException(
            `Unsupported file type: ${file.mimeType}`,
          );
      }

      if (!documents.length) {
        throw new BadRequestException(
          'Uploaded file is empty or could not be processed.',
        );
      }

      const chunks = await this.textSplitter.split(documents);

      const embeddedChunks = await this.embeddingsService.embedChunks(chunks);

      await this.vectorStore.upsert(embeddedChunks);
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'READY' } as dbDocType,
      });
      return {
        message: 'Document indexed successfully.',
        chunks: embeddedChunks.length,
      };
    } catch (error) {
      if (documentId) {
        await this.prisma.document.update({
          where: { id: documentId },
          data: { status: 'FAILED' } as dbDocType,
        });
      }
      throw error;
    }
  }
}
