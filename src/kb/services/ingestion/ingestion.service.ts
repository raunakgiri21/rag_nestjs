/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { Document } from '@langchain/core/documents';

import { PdfLoaderService } from '../../loaders/pdf-loader.service';
import { IngestFile } from '../../types/ingest-file.type';
import { TextSplitterService } from 'src/kb/splitters/text-splitter.service';
import { EmbeddingsService } from 'src/kb/embeddings/embeddings.service';
import { PlainTextLoaderService } from 'src/kb/loaders/text-loader.service';
import { VectorStoreService } from 'src/kb/vector-store/vector-store.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { FileStorageService } from 'src/storage/file-storage.service';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly pdfLoader: PdfLoaderService,
    private readonly plaintextLoader: PlainTextLoaderService,
    private readonly textSplitter: TextSplitterService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly vectorStore: VectorStoreService,
    private readonly prisma: PrismaService,
    private readonly fileStorage: FileStorageService,
  ) {}

  async ingest(
    file: IngestFile,
    userId: string,
  ): Promise<{ message: string; chunks: number }> {
    let documentId: string | null = null;
    let storageKey: string | null = null;

    // Validate before creating a database record.
    if (file.mimeType !== 'application/pdf' && file.mimeType !== 'text/plain') {
      throw new BadRequestException(`Unsupported file type: ${file.mimeType}`);
    }

    try {
      // 1. Check for an existing document with the same name.
      const existingDoc = await this.prisma.document.findFirst({
        where: {
          userId,
          fileName: file.originalName,
          status: 'READY',
        },
      });

      if (existingDoc) {
        throw new BadRequestException(
          `Document with name ${file.originalName} already exists.`,
        );
      }

      // 2. Create a PENDING document record.
      const newDoc = await this.prisma.document.create({
        data: {
          userId,
          fileName: file.originalName,
          status: 'PENDING',
        },
      });

      documentId = newDoc.id;

      // 3. Store the original PDF in SeaweedFS.
      if (file.mimeType === 'application/pdf') {
        storageKey = await this.fileStorage.save(
          file.buffer,
          file.originalName,
          file.mimeType,
          userId,
        );

        // Save the storage reference in PostgreSQL.
        await this.prisma.document.update({
          where: { id: documentId },
          data: { storageKey },
        });
      }

      // 4. Extract text from the uploaded file.
      let documents: Document[];

      if (file.mimeType === 'application/pdf') {
        documents = await this.pdfLoader.load(file);
      } else {
        documents = await this.plaintextLoader.load(file);
      }

      if (!documents.length) {
        throw new BadRequestException(
          'Uploaded file is empty or could not be processed.',
        );
      }

      // 5. Split extracted text into chunks.
      const chunks = await this.textSplitter.split(documents);

      // 6. Generate embeddings.
      const embeddedChunks = await this.embeddingsService.embedChunks(chunks);

      // 7. Store vectors in Qdrant.
      await this.vectorStore.upsert(embeddedChunks, documentId, userId);

      // 8. Mark document as successfully indexed.
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'READY' },
      });

      return {
        message: 'Document indexed successfully.',
        chunks: embeddedChunks.length,
      };
    } catch (error) {
      this.logger.error(
        `Document ingestion failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      if (documentId) {
        // Keep the failed record for troubleshooting.
        try {
          await this.prisma.document.update({
            where: { id: documentId },
            data: { status: 'FAILED' },
          });
        } catch (cleanupError) {
          this.logger.error('Failed to update document status.');
        }

        // Remove any vectors that may have been inserted.
        try {
          await this.vectorStore.deleteChunksByDocumentId(documentId);
        } catch (cleanupError) {
          this.logger.error('Failed to clean up Qdrant vectors.');
        }

        // Remove the original PDF from object storage.
        if (storageKey) {
          try {
            await this.fileStorage.delete(storageKey);
          } catch (cleanupError) {
            this.logger.error('Failed to clean up stored PDF.');
          }
        }
      }

      // Preserve and propagate the original error.
      throw error;
    }
  }
}
