import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LocalesService } from './locales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createLocaleSchema,
  paginationQuerySchema,
  type CreateLocaleInput,
  type PaginationQuery,
} from '@marketlum/shared';

@Controller('locales')
@UseGuards(JwtAuthGuard)
export class LocalesController {
  constructor(private readonly localesService: LocalesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createLocaleSchema))
    body: CreateLocaleInput,
  ) {
    return this.localesService.create(body);
  }

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema))
    query: PaginationQuery,
  ) {
    return this.localesService.findAll(query);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.localesService.remove(id);
  }
}
