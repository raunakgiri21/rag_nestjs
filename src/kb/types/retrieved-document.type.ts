export interface RetrievedDocument {
  content: string;
  source: string;
  page: number;
  score: number;
  chunkId?: string;
}
