import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository, Repository } from 'typeorm';
import { Folder } from './entities/folder.entity';
import { File } from './entities/file.entity';
import { CreateFolderInput, UpdateFolderInput, MoveFolderInput } from '@marketlum/shared';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Inject } from '@nestjs/common';

@Injectable()
export class FoldersService {
  constructor(
    @InjectRepository(Folder)
    private readonly folderRepository: TreeRepository<Folder>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    @Inject('UPLOADS_DIR')
    private readonly uploadsDir: string,
  ) {}

  async create(input: CreateFolderInput): Promise<Folder> {
    const folder = this.folderRepository.create({
      name: input.name,
    });

    if (input.parentId) {
      const parent = await this.folderRepository.findOne({
        where: { id: input.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }
      folder.parent = parent;
    }

    return this.folderRepository.save(folder);
  }

  async findTree(): Promise<Folder[]> {
    return this.folderRepository.findTrees();
  }

  async findOne(id: string): Promise<Folder> {
    const folder = await this.folderRepository.findOne({ where: { id } });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    return folder;
  }

  async update(id: string, input: UpdateFolderInput): Promise<Folder> {
    const folder = await this.findOne(id);
    Object.assign(folder, input);
    return this.folderRepository.save(folder);
  }

  async move(id: string, input: MoveFolderInput): Promise<Folder> {
    const folder = await this.findOne(id);

    if (input.parentId === null) {
      folder.parent = null;
    } else {
      const parent = await this.folderRepository.findOne({
        where: { id: input.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }
      folder.parent = parent;
    }

    return this.folderRepository.save(folder);
  }

  async remove(id: string): Promise<void> {
    const folder = await this.findOne(id);
    const descendants = await this.folderRepository.findDescendants(folder);

    // Collect all files in the folder and its descendants
    const descendantIds = descendants.map((d) => d.id);
    const files = await this.fileRepository
      .createQueryBuilder('file')
      .where('file.folderId IN (:...ids)', { ids: descendantIds })
      .getMany();

    // Delete physical files
    for (const file of files) {
      const filePath = path.join(this.uploadsDir, file.storedName);
      try {
        await fs.unlink(filePath);
      } catch {
        // File may already be deleted
      }
    }

    // Sort by level descending so leaves are removed first
    descendants.sort((a, b) => b.level - a.level);
    await this.folderRepository.remove(descendants);
  }
}
