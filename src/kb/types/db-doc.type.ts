export interface dbDocType {
  id: string;
  userId: string;
  fileName: string;
  status: 'PENDING' | 'FAILED' | 'READY';
  createdAt: Date;
}
