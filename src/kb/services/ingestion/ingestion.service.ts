import { BadRequestException, Injectable } from '@nestjs/common';

import { PdfLoaderService } from '../../loaders/pdf-loader.service';
import { IngestFile } from '../../types/ingest-file.type';
import { Document } from '@langchain/core/documents';
import { TextSplitterService } from 'src/kb/splitters/text-splitter.service';
import { EmbeddingsService } from 'src/kb/embeddings/embeddings.service';
import { PlainTextLoaderService } from 'src/kb/loaders/text-loader.service';
import { VectorStoreService } from 'src/kb/vector-store/vector-store.service';

@Injectable()
export class IngestionService {
  constructor(
    private readonly pdfLoader: PdfLoaderService,
    private readonly plaintextLoader: PlainTextLoaderService,
    private readonly textSplitter: TextSplitterService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly vectorStore: VectorStoreService,
  ) {}

  async ingest(file: IngestFile) {
    let documents: Document[] = [];

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

    return {
      message: 'Document indexed successfully.',
      chunks: embeddedChunks.length,
    };
  }
}
