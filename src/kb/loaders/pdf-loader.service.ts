import { Injectable } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { IngestFile } from 'src/kb/types/ingest-file.type';

@Injectable()
export class PdfLoaderService {
  async load(file: IngestFile): Promise<Document[]> {
    const blob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimeType,
    });
    const loader = new PDFLoader(blob, {
      splitPages: true,
    });
    const docs = await loader.load();
    return docs.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        source: file.originalName,
      },
    }));
  }
}
