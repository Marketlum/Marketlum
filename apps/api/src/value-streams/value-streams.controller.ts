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
import { ValueStreamsService } from './value-streams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createValueStreamSchema,
  updateValueStreamSchema,
  moveValueStreamSchema,
  paginationQuerySchema,
  CreateValueStreamInput,
  UpdateValueStreamInput,
  MoveValueStreamInput,
  PaginationQuery,
} from '@marketlum/shared';

@Controller('value-streams')
@UseGuards(JwtAuthGuard)
export class ValueStreamsController {
  constructor(private readonly valueStreamsService: ValueStreamsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createValueStreamSchema)) body: CreateValueStreamInput,
  ) {
    return this.valueStreamsService.create(body);
  }

  @Get('search')
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.valueStreamsService.search(query);
  }

  @Get('tree')
  async findTree() {
    return this.valueStreamsService.findTree();
  }

  @Get('roots')
  async findRoots() {
    return this.valueStreamsService.findRoots();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.valueStreamsService.findOne(id);
  }

  @Get(':id/children')
  async findChildren(@Param('id') id: string) {
    return this.valueStreamsService.findChildren(id);
  }

  @Get(':id/descendants')
  async findDescendantsTree(@Param('id') id: string) {
    return this.valueStreamsService.findDescendantsTree(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateValueStreamSchema)) body: UpdateValueStreamInput,
  ) {
    return this.valueStreamsService.update(id, body);
  }

  @Patch(':id/move')
  async move(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveValueStreamSchema)) body: MoveValueStreamInput,
  ) {
    return this.valueStreamsService.move(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.valueStreamsService.remove(id);
  }
}
