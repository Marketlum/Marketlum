import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Delete,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Res,
  NotFoundException,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FilesService, UploadResult } from './files.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { MoveFileDto } from './dto/move-file.dto';
import { CropImageDto } from './dto/crop-image.dto';
import { ResizeImageDto } from './dto/resize-image.dto';
import { GrayscaleImageDto } from './dto/grayscale-image.dto';
import * as fs from 'fs';

interface UploadedFileData {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  // ========== FOLDER ENDPOINTS (must come before :id routes) ==========

  @Get('folders/tree')
  async getFoldersTree() {
    return this.filesService.findFoldersTree();
  }

  @Post('folders')
  async createFolder(@Body() createDto: CreateFolderDto) {
    return this.filesService.createFolder(createDto);
  }

  @Get('folders/:id')
  async getFolder(@Param('id') id: string) {
    return this.filesService.findFolder(id);
  }

  @Patch('folders/:id')
  async updateFolder(@Param('id') id: string, @Body() updateDto: UpdateFolderDto) {
    return this.filesService.updateFolder(id, updateDto);
  }

  @Delete('folders/:id')
  async deleteFolder(@Param('id') id: string) {
    await this.filesService.deleteFolder(id);
    return { success: true };
  }

  // ========== SEED ENDPOINT (must come before :id routes) ==========

  @Post('seed')
  async seed() {
    return this.filesService.seed();
  }

  // ========== FILE UPLOAD ENDPOINTS ==========

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 20, { storage: undefined }))
  async uploadMultiple(
    @UploadedFiles() files: UploadedFileData[],
    @Body('folderId') folderId?: string,
  ): Promise<UploadResult> {
    return this.filesService.uploadMultiple(files || [], folderId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: undefined }))
  async upload(
    @UploadedFile() file: UploadedFileData,
    @Body('folderId') folderId?: string,
  ) {
    return this.filesService.uploadSingle(file, folderId);
  }

  // ========== FILE LIST ENDPOINT ==========

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('folderId') folderId?: string,
    @Query('q') q?: string,
    @Query('mimeGroup') mimeGroup?: 'image' | 'video' | 'audio' | 'pdf' | 'doc' | 'other',
    @Query('sort') sort?: string,
  ) {
    return this.filesService.findAll(
      { folderId, q, mimeGroup, sort },
      { page, limit },
    );
  }

  // ========== FILE :id ENDPOINTS ==========

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.filesService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateFileDto) {
    return this.filesService.update(id, updateDto);
  }

  @Post(':id/move')
  async move(@Param('id') id: string, @Body() moveDto: MoveFileDto) {
    return this.filesService.move(id, moveDto);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const file = await this.filesService.findOne(id);
    const filePath = this.filesService.getFilePath(file);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found on disk');
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Get(':id/preview')
  async preview(@Param('id') id: string, @Res() res: Response) {
    const file = await this.filesService.findOne(id);
    const filePath = this.filesService.getFilePath(file);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found on disk');
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Get(':id/thumbnail')
  async thumbnail(@Param('id') id: string, @Res() res: Response) {
    const file = await this.filesService.findOne(id);
    const thumbnailPath = this.filesService.getThumbnailPath(file);

    if (!thumbnailPath || !fs.existsSync(thumbnailPath)) {
      // Fallback to original file for non-images or if thumbnail doesn't exist
      const filePath = this.filesService.getFilePath(file);
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('File not found on disk');
      }
      res.setHeader('Content-Type', file.mimeType);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      return;
    }

    res.setHeader('Content-Type', 'image/jpeg');
    const fileStream = fs.createReadStream(thumbnailPath);
    fileStream.pipe(res);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.filesService.delete(id);
    return { success: true };
  }

  // ========== IMAGE EDITING ENDPOINTS ==========

  @Post(':id/edit/crop')
  async cropImage(@Param('id') id: string, @Body() cropDto: CropImageDto) {
    const newFile = await this.filesService.cropImage(id, cropDto);
    return newFile;
  }

  @Post(':id/edit/resize')
  async resizeImage(@Param('id') id: string, @Body() resizeDto: ResizeImageDto) {
    const newFile = await this.filesService.resizeImage(id, resizeDto);
    return newFile;
  }

  @Post(':id/edit/grayscale')
  async grayscaleImage(@Param('id') id: string, @Body() grayscaleDto: GrayscaleImageDto) {
    const newFile = await this.filesService.grayscaleImage(id, grayscaleDto);
    return newFile;
  }
}
