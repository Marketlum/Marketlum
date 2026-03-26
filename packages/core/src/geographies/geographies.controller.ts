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
import { GeographiesService } from './geographies.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createGeographySchema,
  updateGeographySchema,
  moveGeographySchema,
  CreateGeographyInput,
  UpdateGeographyInput,
  MoveGeographyInput,
} from '@marketlum/shared';

@Controller('geographies')
@UseGuards(AdminGuard)
export class GeographiesController {
  constructor(private readonly geographiesService: GeographiesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createGeographySchema))
    body: CreateGeographyInput,
  ) {
    return this.geographiesService.create(body);
  }

  @Get('tree')
  async findTree() {
    return this.geographiesService.findTree();
  }

  @Get('roots')
  async findRoots() {
    return this.geographiesService.findRoots();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.geographiesService.findOne(id);
  }

  @Get(':id/children')
  async findChildren(@Param('id') id: string) {
    return this.geographiesService.findChildren(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateGeographySchema))
    body: UpdateGeographyInput,
  ) {
    return this.geographiesService.update(id, body);
  }

  @Patch(':id/move')
  async move(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveGeographySchema))
    body: MoveGeographyInput,
  ) {
    return this.geographiesService.move(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.geographiesService.remove(id);
  }
}
