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
import { AgreementsService } from './agreements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createAgreementSchema,
  updateAgreementSchema,
  moveAgreementSchema,
  paginationQuerySchema,
  CreateAgreementInput,
  UpdateAgreementInput,
  MoveAgreementInput,
  PaginationQuery,
} from '@marketlum/shared';

@Controller('agreements')
@UseGuards(JwtAuthGuard)
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createAgreementSchema)) body: CreateAgreementInput,
  ) {
    return this.agreementsService.create(body);
  }

  @Get('search')
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.agreementsService.search(query);
  }

  @Get('tree')
  async findTree() {
    return this.agreementsService.findTree();
  }

  @Get('roots')
  async findRoots() {
    return this.agreementsService.findRoots();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.agreementsService.findOne(id);
  }

  @Get(':id/children')
  async findChildren(@Param('id') id: string) {
    return this.agreementsService.findChildren(id);
  }

  @Get(':id/descendants')
  async findDescendantsTree(@Param('id') id: string) {
    return this.agreementsService.findDescendantsTree(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAgreementSchema)) body: UpdateAgreementInput,
  ) {
    return this.agreementsService.update(id, body);
  }

  @Patch(':id/move')
  async move(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveAgreementSchema)) body: MoveAgreementInput,
  ) {
    return this.agreementsService.move(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.agreementsService.remove(id);
  }
}
