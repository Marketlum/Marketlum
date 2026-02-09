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
import { TaxonomiesService } from './taxonomies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createTaxonomySchema,
  updateTaxonomySchema,
  moveTaxonomySchema,
  CreateTaxonomyInput,
  UpdateTaxonomyInput,
  MoveTaxonomyInput,
} from '@marketlum/shared';

@Controller('taxonomies')
@UseGuards(JwtAuthGuard)
export class TaxonomiesController {
  constructor(private readonly taxonomiesService: TaxonomiesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createTaxonomySchema)) body: CreateTaxonomyInput,
  ) {
    return this.taxonomiesService.create(body);
  }

  @Get('tree')
  async findTree() {
    return this.taxonomiesService.findTree();
  }

  @Get('roots')
  async findRoots() {
    return this.taxonomiesService.findRoots();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.taxonomiesService.findOne(id);
  }

  @Get(':id/children')
  async findChildren(@Param('id') id: string) {
    return this.taxonomiesService.findChildren(id);
  }

  @Get(':id/descendants')
  async findDescendantsTree(@Param('id') id: string) {
    return this.taxonomiesService.findDescendantsTree(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTaxonomySchema)) body: UpdateTaxonomyInput,
  ) {
    return this.taxonomiesService.update(id, body);
  }

  @Patch(':id/move')
  async move(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveTaxonomySchema)) body: MoveTaxonomyInput,
  ) {
    return this.taxonomiesService.move(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.taxonomiesService.remove(id);
  }
}
