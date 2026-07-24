import { Injectable } from '@nestjs/common';
import { IngestionService } from './services/ingestion/ingestion.service';
import { RetrieverService } from './services/retriever/retriever.service';
import { IngestFile } from './types/ingest-file.type';

@Injectable()
export class KbService {
  constructor(
    private readonly retriever: RetrieverService,
    private readonly ingestion: IngestionService,
  ) {}

  retrieve(query: string, limit: number = 5) {
    return this.retriever.retrieve(query, limit);
  }

  ingest(file: IngestFile) {
    return this.ingestion.ingest(file);
  }
}
