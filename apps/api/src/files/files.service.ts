import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileUpload } from './entities/file-upload.entity';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class FilesService {
  private readonly uploadDir = './uploads';

  constructor(
    @InjectRepository(FileUpload)
    private readonly fileRepository: Repository<FileUpload>,
  ) {
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: UploadedFile): Promise<FileUpload> {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    const storageKey = path.join(this.uploadDir, uniqueName);

    // Save file to disk
    fs.writeFileSync(storageKey, file.buffer);

    // Save metadata to database
    const fileUpload = this.fileRepository.create({
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageKey: uniqueName,
    });

    return this.fileRepository.save(fileUpload);
  }

  async findOne(id: string): Promise<FileUpload> {
    const file = await this.fileRepository.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }
    return file;
  }

  async delete(id: string): Promise<void> {
    const file = await this.findOne(id);

    // Delete from filesystem
    const filePath = path.join(this.uploadDir, file.storageKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await this.fileRepository.remove(file);
  }

  getFilePath(file: FileUpload): string {
    return path.join(this.uploadDir, file.storageKey);
  }
}
