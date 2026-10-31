import { Module } from '@nestjs/common';
import { IngestionService } from './services/ingestion/ingestion.service';
import { RetrieverService } from './services/retriever/retriever.service';
import { EmbeddingsService } from './embeddings/embeddings.service';
import { VectorStoreService } from './vector-store/vector-store.service';
import { KbController } from './kb.controller';
import { PdfLoaderService } from './loaders/pdf-loader.service';
import { PlainTextLoaderService } from './loaders/text-loader.service';
import { TextSplitterService } from './splitters/text-splitter.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { KbService } from './kb.service';
import { FileStorageService } from 'src/storage/file-storage.service';

@Module({
  providers: [
    KbService,
    IngestionService,
    RetrieverService,
    EmbeddingsService,
    VectorStoreService,
    PdfLoaderService,
    PlainTextLoaderService,
    TextSplitterService,
    PrismaService,
    FileStorageService,
  ],
  controllers: [KbController],
  exports: [KbService],
})
export class KbModule {}
