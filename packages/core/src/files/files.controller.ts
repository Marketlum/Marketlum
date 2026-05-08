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
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiConsumes,
  ApiProduces,
  ApiExtraModels,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FilesService } from './files.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import {
  updateFileSchema,
  fileQuerySchema,
  UpdateFileInput,
  FileQuery,
} from '@marketlum/shared';
import { UpdateFileDto, FileResponseDto } from './file.dto';

@ApiTags('files')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(FileResponseDto)
@Controller('files')
@UseGuards(AdminGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folderId: { type: 'string', description: 'Optional folder UUID', nullable: true },
      },
      required: ['file'],
    },
  })
  @ApiCreatedResponse({ type: FileResponseDto })
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
  @ApiOperation({ summary: 'List files (optionally filtered by folder, mime type, etc.)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'folderId', required: false, type: String })
  @ApiQuery({ name: 'mimeType', required: false, type: String })
  @ApiPaginatedResponse(FileResponseDto)
  async findAll(
    @Query(new ZodValidationPipe(fileQuerySchema)) query: FileQuery,
  ) {
    return this.filesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a file metadata record' })
  @ApiParam({ name: 'id', type: String, description: 'File UUID' })
  @ApiOkResponse({ type: FileResponseDto })
  @ApiNotFoundResponse({ description: 'File not found' })
  async findOne(@Param('id') id: string) {
    return this.filesService.findOne(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download the file binary' })
  @ApiParam({ name: 'id', type: String, description: 'File UUID' })
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({
    description: 'Binary content',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiNotFoundResponse({ description: 'File not found' })
  async download(@Param('id') id: string, @Res() res: Response) {
    const { result, file } = await this.filesService.getFileDownload(id);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimeType);
    if (result.filePath) {
      res.sendFile(result.filePath);
    } else {
      result.stream.pipe(res);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update file metadata' })
  @ApiParam({ name: 'id', type: String, description: 'File UUID' })
  @ApiBody({ type: UpdateFileDto })
  @ApiOkResponse({ type: FileResponseDto })
  @ApiNotFoundResponse({ description: 'File not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateFileSchema)) body: UpdateFileInput,
  ) {
    return this.filesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a file' })
  @ApiParam({ name: 'id', type: String, description: 'File UUID' })
  @ApiNoContentResponse({ description: 'File deleted' })
  @ApiNotFoundResponse({ description: 'File not found' })
  async remove(@Param('id') id: string) {
    await this.filesService.remove(id);
  }
}
