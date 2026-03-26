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

@Controller('folders')
@UseGuards(AdminGuard)
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createFolderSchema)) body: CreateFolderInput,
  ) {
    return this.foldersService.create(body);
  }

  @Get('tree')
  async findTree() {
    return this.foldersService.findTree();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.foldersService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateFolderSchema)) body: UpdateFolderInput,
  ) {
    return this.foldersService.update(id, body);
  }

  @Patch(':id/move')
  async move(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveFolderSchema)) body: MoveFolderInput,
  ) {
    return this.foldersService.move(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.foldersService.remove(id);
  }
}
