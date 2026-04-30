import { NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import { createReadStream } from 'fs';
import * as path from 'path';
import { StorageProvider, StorageDownloadResult } from './storage-provider.interface';

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly uploadsDir: string) {}

  async upload(key: string, buffer: Buffer): Promise<void> {
    await fs.mkdir(this.uploadsDir, { recursive: true });
    await fs.writeFile(path.join(this.uploadsDir, key), buffer);
  }

  async download(key: string): Promise<StorageDownloadResult> {
    const filePath = path.join(this.uploadsDir, key);
    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundException('File not found on disk');
    }
    return {
      stream: createReadStream(filePath),
      filePath,
    };
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(path.join(this.uploadsDir, key));
    } catch {
      // File may already be deleted
    }
  }
}
