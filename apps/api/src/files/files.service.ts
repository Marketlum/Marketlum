import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, IsNull, ILike } from 'typeorm';
import { FileUpload, StorageProvider } from './entities/file-upload.entity';
import { Folder } from './entities/folder.entity';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { MoveFileDto } from './dto/move-file.dto';
import { CropImageDto } from './dto/crop-image.dto';
import { ResizeImageDto } from './dto/resize-image.dto';
import { GrayscaleImageDto } from './dto/grayscale-image.dto';
import { paginate, Pagination, IPaginationOptions } from 'nestjs-typeorm-paginate';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';
import * as crypto from 'crypto';

interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface ListFilters {
  folderId?: string | null;
  q?: string;
  mimeGroup?: 'image' | 'video' | 'audio' | 'pdf' | 'doc' | 'other';
  sort?: string;
}

export interface UploadResult {
  uploaded: FileUpload[];
  failed: Array<{ originalName: string; reason: string }>;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const THUMBNAIL_SIZE = 200;

@Injectable()
export class FilesService {
  private readonly uploadDir = './uploads';
  private readonly thumbnailDir = './uploads/thumbnails';

  constructor(
    @InjectRepository(FileUpload)
    private readonly fileRepository: Repository<FileUpload>,
    @InjectRepository(Folder)
    private readonly folderRepository: Repository<Folder>,
  ) {
    // Ensure upload directories exist
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    if (!fs.existsSync(this.thumbnailDir)) {
      fs.mkdirSync(this.thumbnailDir, { recursive: true });
    }
  }

  private get folderTreeRepository(): TreeRepository<Folder> {
    return this.folderRepository.manager.getTreeRepository(Folder);
  }

  // ========== FILE OPERATIONS ==========

  async uploadMultiple(files: UploadedFile[], folderId?: string): Promise<UploadResult> {
    const result: UploadResult = { uploaded: [], failed: [] };

    // Validate folder if provided
    if (folderId) {
      const folder = await this.folderRepository.findOne({ where: { id: folderId } });
      if (!folder) {
        throw new NotFoundException(`Folder with ID ${folderId} not found`);
      }
    }

    for (const file of files) {
      try {
        const uploaded = await this.uploadSingle(file, folderId);
        result.uploaded.push(uploaded);
      } catch (error) {
        result.failed.push({
          originalName: file.originalname,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  async uploadSingle(file: UploadedFile, folderId?: string): Promise<FileUpload> {
    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const uniqueId = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    const fileName = `${uniqueId}${ext}`;
    const storageKey = fileName;
    const filePath = path.join(this.uploadDir, fileName);

    // Calculate checksum
    const checksum = crypto.createHash('md5').update(file.buffer).digest('hex');

    // Save file to disk
    fs.writeFileSync(filePath, file.buffer);

    // Get image dimensions and create thumbnail if it's an image
    let width: number | null = null;
    let height: number | null = null;
    let thumbnailKey: string | null = null;

    if (file.mimetype.startsWith('image/') && !file.mimetype.includes('svg')) {
      try {
        const metadata = await sharp(file.buffer).metadata();
        width = metadata.width || null;
        height = metadata.height || null;

        // Create thumbnail
        const thumbnailFileName = `thumb_${fileName}`;
        const thumbnailPath = path.join(this.thumbnailDir, thumbnailFileName);
        await sharp(file.buffer)
          .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
          .toFile(thumbnailPath);
        thumbnailKey = `thumbnails/${thumbnailFileName}`;
      } catch {
        // If image processing fails, continue without dimensions/thumbnail
      }
    }

    // Save metadata to database
    const fileUpload = this.fileRepository.create({
      originalName: file.originalname,
      fileName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      width,
      height,
      checksum,
      storageProvider: StorageProvider.LOCAL,
      storageKey,
      thumbnailKey,
      folderId: folderId || null,
    });

    return this.fileRepository.save(fileUpload);
  }

  async findAll(filters: ListFilters, options: IPaginationOptions): Promise<Pagination<FileUpload>> {
    const queryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.folder', 'folder')
      .where('file.isArchived = :isArchived', { isArchived: false });

    // Filter by folder
    if (filters.folderId === null || filters.folderId === 'null') {
      queryBuilder.andWhere('file.folderId IS NULL');
    } else if (filters.folderId) {
      queryBuilder.andWhere('file.folderId = :folderId', { folderId: filters.folderId });
    }

    // Search
    if (filters.q) {
      queryBuilder.andWhere(
        '(file.originalName ILIKE :q OR file.caption ILIKE :q OR file.altText ILIKE :q)',
        { q: `%${filters.q}%` }
      );
    }

    // Filter by mime group
    if (filters.mimeGroup) {
      switch (filters.mimeGroup) {
        case 'image':
          queryBuilder.andWhere("file.mimeType LIKE 'image/%'");
          break;
        case 'video':
          queryBuilder.andWhere("file.mimeType LIKE 'video/%'");
          break;
        case 'audio':
          queryBuilder.andWhere("file.mimeType LIKE 'audio/%'");
          break;
        case 'pdf':
          queryBuilder.andWhere("file.mimeType = 'application/pdf'");
          break;
        case 'doc':
          queryBuilder.andWhere(
            "(file.mimeType LIKE 'application/msword%' OR file.mimeType LIKE 'application/vnd.openxmlformats%' OR file.mimeType LIKE 'text/%')"
          );
          break;
        case 'other':
          queryBuilder.andWhere(
            "file.mimeType NOT LIKE 'image/%' AND file.mimeType NOT LIKE 'video/%' AND file.mimeType NOT LIKE 'audio/%' AND file.mimeType != 'application/pdf'"
          );
          break;
      }
    }

    // Sorting
    this.applySorting(queryBuilder, filters.sort);

    return paginate<FileUpload>(queryBuilder, options);
  }

  private applySorting(queryBuilder: any, sort?: string) {
    if (sort) {
      const [field, order] = sort.split('_');
      const orderDirection = order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      switch (field) {
        case 'name':
          queryBuilder.orderBy('file.originalName', orderDirection);
          break;
        case 'size':
          queryBuilder.orderBy('file.sizeBytes', orderDirection);
          break;
        case 'createdAt':
          queryBuilder.orderBy('file.createdAt', orderDirection);
          break;
        default:
          queryBuilder.orderBy('file.createdAt', 'DESC');
      }
    } else {
      queryBuilder.orderBy('file.createdAt', 'DESC');
    }
  }

  async findOne(id: string): Promise<FileUpload> {
    const file = await this.fileRepository.findOne({
      where: { id },
      relations: ['folder'],
    });
    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }
    return file;
  }

  async update(id: string, updateDto: UpdateFileDto): Promise<FileUpload> {
    const file = await this.findOne(id);

    if (updateDto.folderId !== undefined) {
      if (updateDto.folderId === null) {
        file.folder = null;
        file.folderId = null;
      } else {
        const folder = await this.folderRepository.findOne({ where: { id: updateDto.folderId } });
        if (!folder) {
          throw new NotFoundException(`Folder with ID ${updateDto.folderId} not found`);
        }
        file.folder = folder;
        file.folderId = updateDto.folderId;
      }
    }

    if (updateDto.altText !== undefined) {
      file.altText = updateDto.altText;
    }

    if (updateDto.caption !== undefined) {
      file.caption = updateDto.caption;
    }

    return this.fileRepository.save(file);
  }

  async move(id: string, moveDto: MoveFileDto): Promise<FileUpload> {
    const file = await this.findOne(id);

    if (moveDto.folderId === null || moveDto.folderId === undefined) {
      file.folder = null;
      file.folderId = null;
    } else {
      const folder = await this.folderRepository.findOne({ where: { id: moveDto.folderId } });
      if (!folder) {
        throw new NotFoundException(`Folder with ID ${moveDto.folderId} not found`);
      }
      file.folder = folder;
      file.folderId = moveDto.folderId;
    }

    return this.fileRepository.save(file);
  }

  async delete(id: string): Promise<void> {
    const file = await this.findOne(id);

    // Check if file is referenced by any agreement
    const agreementCount = await this.fileRepository.manager
      .getRepository('Agreement')
      .count({ where: { fileId: id } });

    if (agreementCount > 0) {
      throw new ConflictException('File is in use and cannot be deleted.');
    }

    // Delete from filesystem
    const filePath = path.join(this.uploadDir, file.storageKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete thumbnail if exists
    if (file.thumbnailKey) {
      const thumbnailPath = path.join(this.uploadDir, file.thumbnailKey);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }

    // Delete from database
    await this.fileRepository.remove(file);
  }

  getFilePath(file: FileUpload): string {
    return path.join(this.uploadDir, file.storageKey);
  }

  getThumbnailPath(file: FileUpload): string | null {
    if (!file.thumbnailKey) return null;
    return path.join(this.uploadDir, file.thumbnailKey);
  }

  // ========== IMAGE EDITING ==========

  async cropImage(id: string, cropDto: CropImageDto): Promise<FileUpload> {
    const file = await this.findOne(id);

    if (!file.mimeType.startsWith('image/')) {
      throw new BadRequestException('Editing is only supported for images.');
    }

    const filePath = this.getFilePath(file);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found on disk');
    }

    // Validate crop bounds
    if (file.width && file.height) {
      if (cropDto.x + cropDto.width > file.width || cropDto.y + cropDto.height > file.height) {
        throw new BadRequestException('Crop bounds exceed image dimensions');
      }
    }

    const uniqueId = crypto.randomUUID();
    const outputFormat = cropDto.outputFormat || path.extname(file.originalName).slice(1) || 'png';
    const newFileName = `${uniqueId}.${outputFormat}`;
    const newFilePath = path.join(this.uploadDir, newFileName);

    // Perform crop
    const croppedBuffer = await sharp(filePath)
      .extract({
        left: Math.round(cropDto.x),
        top: Math.round(cropDto.y),
        width: Math.round(cropDto.width),
        height: Math.round(cropDto.height),
      })
      .toBuffer();

    fs.writeFileSync(newFilePath, croppedBuffer);

    // Get new dimensions
    const metadata = await sharp(croppedBuffer).metadata();

    // Create thumbnail
    let thumbnailKey: string | null = null;
    const thumbnailFileName = `thumb_${newFileName}`;
    const thumbnailPath = path.join(this.thumbnailDir, thumbnailFileName);
    await sharp(croppedBuffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
      .toFile(thumbnailPath);
    thumbnailKey = `thumbnails/${thumbnailFileName}`;

    // Create new file record
    const newFile = this.fileRepository.create({
      originalName: `${path.basename(file.originalName, path.extname(file.originalName))} (cropped).${outputFormat}`,
      fileName: newFileName,
      mimeType: `image/${outputFormat}`,
      sizeBytes: croppedBuffer.length,
      width: metadata.width || null,
      height: metadata.height || null,
      storageProvider: StorageProvider.LOCAL,
      storageKey: newFileName,
      thumbnailKey,
      folderId: file.folderId,
    });

    return this.fileRepository.save(newFile);
  }

  async resizeImage(id: string, resizeDto: ResizeImageDto): Promise<FileUpload> {
    const file = await this.findOne(id);

    if (!file.mimeType.startsWith('image/')) {
      throw new BadRequestException('Editing is only supported for images.');
    }

    const filePath = this.getFilePath(file);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found on disk');
    }

    if (!resizeDto.width && !resizeDto.height) {
      throw new BadRequestException('At least width or height must be specified');
    }

    const uniqueId = crypto.randomUUID();
    const ext = path.extname(file.originalName) || '.png';
    const newFileName = `${uniqueId}${ext}`;
    const newFilePath = path.join(this.uploadDir, newFileName);

    // Perform resize
    let sharpInstance = sharp(filePath);

    if (resizeDto.keepAspectRatio !== false) {
      sharpInstance = sharpInstance.resize(resizeDto.width, resizeDto.height, { fit: 'inside' });
    } else {
      sharpInstance = sharpInstance.resize(resizeDto.width, resizeDto.height, { fit: 'fill' });
    }

    const resizedBuffer = await sharpInstance.toBuffer();
    fs.writeFileSync(newFilePath, resizedBuffer);

    // Get new dimensions
    const metadata = await sharp(resizedBuffer).metadata();

    // Create thumbnail
    let thumbnailKey: string | null = null;
    const thumbnailFileName = `thumb_${newFileName}`;
    const thumbnailPath = path.join(this.thumbnailDir, thumbnailFileName);
    await sharp(resizedBuffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
      .toFile(thumbnailPath);
    thumbnailKey = `thumbnails/${thumbnailFileName}`;

    // Create new file record
    const newFile = this.fileRepository.create({
      originalName: `${path.basename(file.originalName, path.extname(file.originalName))} (resized)${ext}`,
      fileName: newFileName,
      mimeType: file.mimeType,
      sizeBytes: resizedBuffer.length,
      width: metadata.width || null,
      height: metadata.height || null,
      storageProvider: StorageProvider.LOCAL,
      storageKey: newFileName,
      thumbnailKey,
      folderId: file.folderId,
    });

    return this.fileRepository.save(newFile);
  }

  async grayscaleImage(id: string, _grayscaleDto: GrayscaleImageDto): Promise<FileUpload> {
    const file = await this.findOne(id);

    if (!file.mimeType.startsWith('image/')) {
      throw new BadRequestException('Editing is only supported for images.');
    }

    const filePath = this.getFilePath(file);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found on disk');
    }

    const uniqueId = crypto.randomUUID();
    const ext = path.extname(file.originalName) || '.png';
    const newFileName = `${uniqueId}${ext}`;
    const newFilePath = path.join(this.uploadDir, newFileName);

    // Apply grayscale
    const grayscaleBuffer = await sharp(filePath).grayscale().toBuffer();
    fs.writeFileSync(newFilePath, grayscaleBuffer);

    // Get dimensions
    const metadata = await sharp(grayscaleBuffer).metadata();

    // Create thumbnail
    let thumbnailKey: string | null = null;
    const thumbnailFileName = `thumb_${newFileName}`;
    const thumbnailPath = path.join(this.thumbnailDir, thumbnailFileName);
    await sharp(grayscaleBuffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
      .toFile(thumbnailPath);
    thumbnailKey = `thumbnails/${thumbnailFileName}`;

    // Create new file record
    const newFile = this.fileRepository.create({
      originalName: `${path.basename(file.originalName, path.extname(file.originalName))} (grayscale)${ext}`,
      fileName: newFileName,
      mimeType: file.mimeType,
      sizeBytes: grayscaleBuffer.length,
      width: metadata.width || null,
      height: metadata.height || null,
      storageProvider: StorageProvider.LOCAL,
      storageKey: newFileName,
      thumbnailKey,
      folderId: file.folderId,
    });

    return this.fileRepository.save(newFile);
  }

  // ========== FOLDER OPERATIONS ==========

  async createFolder(createDto: CreateFolderDto): Promise<Folder> {
    // Validate parent if provided
    if (createDto.parentId) {
      const parent = await this.folderRepository.findOne({ where: { id: createDto.parentId } });
      if (!parent) {
        throw new NotFoundException(`Parent folder with ID ${createDto.parentId} not found`);
      }
    }

    // Check for duplicate name in same parent
    const existingQuery: any = {
      name: ILike(createDto.name),
    };
    if (createDto.parentId) {
      existingQuery.parentId = createDto.parentId;
    } else {
      existingQuery.parentId = IsNull();
    }

    const existing = await this.folderRepository.findOne({ where: existingQuery });
    if (existing) {
      throw new ConflictException('A folder with this name already exists in the same location');
    }

    const folder = this.folderRepository.create({
      name: createDto.name,
      parentId: createDto.parentId || null,
    });

    return this.folderRepository.save(folder);
  }

  async findFoldersTree(): Promise<Folder[]> {
    return this.folderTreeRepository.findTrees();
  }

  async findFolder(id: string): Promise<Folder> {
    const folder = await this.folderRepository.findOne({
      where: { id },
      relations: ['children', 'files'],
    });
    if (!folder) {
      throw new NotFoundException(`Folder with ID ${id} not found`);
    }
    return folder;
  }

  async updateFolder(id: string, updateDto: UpdateFolderDto): Promise<Folder> {
    const folder = await this.findFolder(id);

    if (updateDto.name) {
      // Check for duplicate name in same parent
      const existingQuery: any = {
        name: ILike(updateDto.name),
      };
      if (folder.parentId) {
        existingQuery.parentId = folder.parentId;
      } else {
        existingQuery.parentId = IsNull();
      }

      const existing = await this.folderRepository.findOne({ where: existingQuery });
      if (existing && existing.id !== id) {
        throw new ConflictException('A folder with this name already exists in the same location');
      }

      folder.name = updateDto.name;
    }

    return this.folderRepository.save(folder);
  }

  async deleteFolder(id: string): Promise<void> {
    const folder = await this.folderRepository.findOne({
      where: { id },
      relations: ['children'],
    });

    if (!folder) {
      throw new NotFoundException(`Folder with ID ${id} not found`);
    }

    // Check for children
    const descendants = await this.folderTreeRepository.findDescendants(folder);
    if (descendants.length > 1) {
      throw new ConflictException('Folder is not empty. Move or delete its contents first.');
    }

    // Check for files
    const fileCount = await this.fileRepository.count({ where: { folderId: id } });
    if (fileCount > 0) {
      throw new ConflictException('Folder is not empty. Move or delete its contents first.');
    }

    await this.folderRepository.remove(folder);
  }

  // ========== SEED DATA ==========

  async seed(): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0;
    let skipped = 0;

    // Seed folders
    const foldersToSeed = ['Contracts', 'Brand', 'Screenshots', 'Product'];

    const folders: Record<string, Folder> = {};

    for (const folderName of foldersToSeed) {
      let folder = await this.folderRepository.findOne({
        where: { name: folderName, parentId: IsNull() },
      });

      if (!folder) {
        folder = this.folderRepository.create({ name: folderName });
        folder = await this.folderRepository.save(folder);
        inserted++;
      } else {
        skipped++;
      }
      folders[folderName] = folder;
    }

    // Seed sample files from seed-assets directory
    const seedAssetsDir = path.join(process.cwd(), 'seed-assets');

    if (fs.existsSync(seedAssetsDir)) {
      const seedFiles = [
        { name: 'marketlum-logo.png', folder: 'Brand' },
        { name: 'sample-agreement.pdf', folder: 'Contracts' },
        { name: 'dashboard-screenshot.png', folder: 'Screenshots' },
      ];

      for (const seedFile of seedFiles) {
        const filePath = path.join(seedAssetsDir, seedFile.name);

        if (fs.existsSync(filePath)) {
          // Check if file already exists
          const existing = await this.fileRepository.findOne({
            where: { originalName: seedFile.name },
          });

          if (!existing) {
            const buffer = fs.readFileSync(filePath);
            const stats = fs.statSync(filePath);

            // Determine mime type
            let mimeType = 'application/octet-stream';
            if (seedFile.name.endsWith('.png')) mimeType = 'image/png';
            else if (seedFile.name.endsWith('.jpg') || seedFile.name.endsWith('.jpeg')) mimeType = 'image/jpeg';
            else if (seedFile.name.endsWith('.pdf')) mimeType = 'application/pdf';

            await this.uploadSingle(
              {
                originalname: seedFile.name,
                mimetype: mimeType,
                size: stats.size,
                buffer,
              },
              folders[seedFile.folder]?.id
            );
            inserted++;
          } else {
            skipped++;
          }
        }
      }
    }

    return { inserted, skipped };
  }
}
