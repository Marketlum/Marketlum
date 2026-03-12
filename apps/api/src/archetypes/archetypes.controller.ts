import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ArchetypesService } from './archetypes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createArchetypeSchema,
  updateArchetypeSchema,
  paginationQuerySchema,
  CreateArchetypeInput,
  UpdateArchetypeInput,
  PaginationQuery,
} from '@marketlum/shared';

@Controller('archetypes')
@UseGuards(JwtAuthGuard)
export class ArchetypesController {
  constructor(private readonly archetypesService: ArchetypesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createArchetypeSchema)) body: CreateArchetypeInput,
  ) {
    return this.archetypesService.create(body);
  }

  @Get('search')
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('taxonomyId') taxonomyId?: string,
  ) {
    return this.archetypesService.search({ ...query, taxonomyId });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.archetypesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateArchetypeSchema)) body: UpdateArchetypeInput,
  ) {
    return this.archetypesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.archetypesService.remove(id);
  }
}
