import { ConfigService } from '@nestjs/config';
import { HttpException, Injectable } from '@nestjs/common';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Document } from '@langchain/core/documents';

@Injectable()
export class EmbeddingsService {
  private readonly embeddingModel: GoogleGenerativeAIEmbeddings;

  constructor(private readonly config: ConfigService) {
    this.embeddingModel = new GoogleGenerativeAIEmbeddings({
      apiKey: this.config.getOrThrow<string>('ai.gemini.apiKey'),
      model: this.config.getOrThrow<string>('ai.gemini.embeddingModel'),
    });
  }

  // Embed a single search query.
  async embedQuery(text: string): Promise<number[]> {
    return this.embeddingModel.embedQuery(text);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return this.embeddingModel.embedDocuments(texts);
  }

  async embedChunks(documents: Document[]): Promise<
    Array<{
      document: Document;
      embedding: number[];
    }>
  > {
    try {
      const texts = documents.map((doc: Document) => doc.pageContent);

      const embeddings = await this.embedDocuments(texts);

      return documents.map((document, index) => ({
        document,
        embedding: embeddings[index],
      }));
    } catch (err) {
      console.log(err);
      throw new HttpException('Error embedding chunks', 500);
    }
  }
}
