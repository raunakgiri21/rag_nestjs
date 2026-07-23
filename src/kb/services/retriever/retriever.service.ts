import { Injectable } from '@nestjs/common';
import { EmbeddingsService } from 'src/kb/embeddings/embeddings.service';
import { VectorStoreService } from 'src/kb/vector-store/vector-store.service';
import { RetrievedDocument } from 'src/kb/types/retrieved-document.type';

@Injectable()
export class RetrieverService {
  constructor(
    private readonly embeddingsService: EmbeddingsService,
    private readonly vectorStore: VectorStoreService,
  ) {}

  async retrieve(query: string, limit = 5): Promise<RetrievedDocument[]> {
    const embedding = await this.embeddingsService.embedQuery(query);

    return await this.vectorStore.search(embedding, limit);
  }
}
