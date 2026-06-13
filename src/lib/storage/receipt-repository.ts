import type { ParsedReceipt, ReceiptRecord } from '../receipt';

export interface ReceiptImage {
  base64?: string | null;
  mimeType?: string | null;
}

export interface ReceiptRepository {
  list(): Promise<ReceiptRecord[]>;
  get(id: string): Promise<ReceiptRecord | null>;
  create(receipt: ParsedReceipt, image?: ReceiptImage): Promise<ReceiptRecord>;
  update(id: string, patch: unknown): Promise<ReceiptRecord | null>;
  delete(id: string): Promise<boolean>;
  observe(
    listener: (receipts: ReceiptRecord[]) => void,
    onError?: (error: unknown) => void,
  ): () => void;
}
