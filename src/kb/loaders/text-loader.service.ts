import { Injectable } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { IngestFile } from 'src/kb/types/ingest-file.type';

@Injectable()
@Injectable()
export class PlainTextLoaderService {
  async load(file: IngestFile): Promise<Document[]> {
    return Promise.resolve([
      new Document({
        pageContent: file.buffer.toString('utf-8'),
        metadata: {
          source: file.originalName,
          mimeType: file.mimeType,
        },
      }),
    ]);
  }
}
