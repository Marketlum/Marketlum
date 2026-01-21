import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FilesService } from './files.service';
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

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: undefined }))
  async upload(@UploadedFile() file: UploadedFileData) {
    return this.filesService.upload(file);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.filesService.findOne(id);
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

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.filesService.delete(id);
    return { success: true };
  }
}
