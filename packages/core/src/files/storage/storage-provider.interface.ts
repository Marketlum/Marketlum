import { Readable } from 'stream';

export interface StorageDownloadResult {
  stream: Readable;
  /** Only set for local storage; enables res.sendFile() optimization. */
  filePath?: string;
}

export interface StorageProvider {
  upload(key: string, buffer: Buffer): Promise<void>;
  download(key: string): Promise<StorageDownloadResult>;
  delete(key: string): Promise<void>;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
