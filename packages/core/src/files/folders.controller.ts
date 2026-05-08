import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiBody,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FoldersService } from './folders.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createFolderSchema,
  updateFolderSchema,
  moveFolderSchema,
  CreateFolderInput,
  UpdateFolderInput,
  MoveFolderInput,
} from '@marketlum/shared';
import {
  CreateFolderDto,
  UpdateFolderDto,
  MoveFolderDto,
  FolderResponseDto,
} from './folder.dto';

@ApiTags('folders')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@Controller('folders')
@UseGuards(AdminGuard)
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a folder' })
  @ApiBody({ type: CreateFolderDto })
  @ApiCreatedResponse({ type: FolderResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createFolderSchema)) body: CreateFolderInput,
  ) {
    return this.foldersService.create(body);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Full folder tree' })
  async findTree() {
    return this.foldersService.findTree();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a folder by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Folder UUID' })
  @ApiOkResponse({ type: FolderResponseDto })
  @ApiNotFoundResponse({ description: 'Folder not found' })
  async findOne(@Param('id') id: string) {
    return this.foldersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a folder' })
  @ApiParam({ name: 'id', type: String, description: 'Folder UUID' })
  @ApiBody({ type: UpdateFolderDto })
  @ApiOkResponse({ type: FolderResponseDto })
  @ApiNotFoundResponse({ description: 'Folder not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateFolderSchema)) body: UpdateFolderInput,
  ) {
    return this.foldersService.update(id, body);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Move a folder under a different parent' })
  @ApiParam({ name: 'id', type: String, description: 'Folder UUID' })
  @ApiBody({ type: MoveFolderDto })
  @ApiOkResponse({ type: FolderResponseDto })
  @ApiNotFoundResponse({ description: 'Folder not found' })
  async move(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveFolderSchema)) body: MoveFolderInput,
  ) {
    return this.foldersService.move(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a folder' })
  @ApiParam({ name: 'id', type: String, description: 'Folder UUID' })
  @ApiNoContentResponse({ description: 'Folder deleted' })
  @ApiNotFoundResponse({ description: 'Folder not found' })
  async remove(@Param('id') id: string) {
    await this.foldersService.remove(id);
  }
}
