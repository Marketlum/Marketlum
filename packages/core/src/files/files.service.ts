import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { File } from './entities/file.entity';
import { Folder } from './entities/folder.entity';
import { UpdateFileInput, FileQuery } from '@marketlum/shared';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    @InjectRepository(Folder)
    private readonly folderRepository: Repository<Folder>,
    @Inject('UPLOADS_DIR')
    private readonly uploadsDir: string,
  ) {}

  async upload(
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    folderId?: string,
  ): Promise<File> {
    if (folderId) {
      const folder = await this.folderRepository.findOne({ where: { id: folderId } });
      if (!folder) {
        throw new NotFoundException('Folder not found');
      }
    }

    const ext = path.extname(file.originalname);
    const storedName = crypto.randomUUID() + ext;

    // Ensure uploads directory exists
    await fs.mkdir(this.uploadsDir, { recursive: true });

    await fs.writeFile(path.join(this.uploadsDir, storedName), file.buffer);

    const entity = this.fileRepository.create({
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      size: file.size,
      folderId: folderId || null,
    });

    return this.fileRepository.save(entity);
  }

  async findAll(query: FileQuery) {
    const { page, limit, search, sortBy, sortOrder, folderId, root } = query;
    const skip = (page - 1) * limit;

    const qb = this.fileRepository.createQueryBuilder('file');

    if (folderId) {
      qb.andWhere('file.folderId = :folderId', { folderId });
    } else if (root) {
      qb.andWhere('file.folderId IS NULL');
    }

    if (search) {
      qb.andWhere('file.originalName ILIKE :search', { search: `%${search}%` });
    }

    if (sortBy) {
      qb.orderBy(`file.${sortBy}`, sortOrder || 'ASC');
    } else {
      qb.orderBy('file.createdAt', 'DESC');
    }

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<File> {
    const file = await this.fileRepository.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    return file;
  }

  async getFilePath(id: string): Promise<{ filePath: string; file: File }> {
    const file = await this.findOne(id);
    const filePath = path.join(this.uploadsDir, file.storedName);

    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundException('File not found on disk');
    }

    return { filePath, file };
  }

  async update(id: string, input: UpdateFileInput): Promise<File> {
    const file = await this.findOne(id);

    if (input.folderId !== undefined) {
      if (input.folderId !== null) {
        const folder = await this.folderRepository.findOne({ where: { id: input.folderId } });
        if (!folder) {
          throw new NotFoundException('Folder not found');
        }
      }
      file.folderId = input.folderId;
    }

    if (input.originalName !== undefined) {
      file.originalName = input.originalName;
    }

    return this.fileRepository.save(file);
  }

  async remove(id: string): Promise<void> {
    const file = await this.findOne(id);
    const filePath = path.join(this.uploadsDir, file.storedName);

    try {
      await fs.unlink(filePath);
    } catch {
      // File may already be deleted
    }

    await this.fileRepository.remove(file);
  }
}
