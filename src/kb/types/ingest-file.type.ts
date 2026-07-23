export interface IngestFile {
  namespace: string;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}
