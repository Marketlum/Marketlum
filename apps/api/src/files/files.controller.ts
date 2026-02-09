import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  updateFileSchema,
  fileQuerySchema,
  UpdateFileInput,
  FileQuery,
} from '@marketlum/shared';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile(
      new ParseFilePipe({ validators: [] }),
    )
    file: Express.Multer.File,
    @Body('folderId') folderId?: string,
  ) {
    return this.filesService.upload(file, folderId || undefined);
  }

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(fileQuerySchema)) query: FileQuery,
  ) {
    return this.filesService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.filesService.findOne(id);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const { filePath, file } = await this.filesService.getFilePath(id);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimeType);
    res.sendFile(filePath);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateFileSchema)) body: UpdateFileInput,
  ) {
    return this.filesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.filesService.remove(id);
  }
}
