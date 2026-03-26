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
import { AgreementTemplatesService } from './agreement-templates.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createAgreementTemplateSchema,
  updateAgreementTemplateSchema,
  moveAgreementTemplateSchema,
  paginationQuerySchema,
  CreateAgreementTemplateInput,
  UpdateAgreementTemplateInput,
  MoveAgreementTemplateInput,
  PaginationQuery,
} from '@marketlum/shared';

@Controller('agreement-templates')
@UseGuards(AdminGuard)
export class AgreementTemplatesController {
  constructor(
    private readonly agreementTemplatesService: AgreementTemplatesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createAgreementTemplateSchema))
    body: CreateAgreementTemplateInput,
  ) {
    return this.agreementTemplatesService.create(body);
  }

  @Get('search')
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('type') type?: string,
    @Query('valueStreamId') valueStreamId?: string,
  ) {
    return this.agreementTemplatesService.search({ ...query, type, valueStreamId });
  }

  @Get('tree')
  async findTree() {
    return this.agreementTemplatesService.findTree();
  }

  @Get('roots')
  async findRoots() {
    return this.agreementTemplatesService.findRoots();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.agreementTemplatesService.findOne(id);
  }

  @Get(':id/children')
  async findChildren(@Param('id') id: string) {
    return this.agreementTemplatesService.findChildren(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAgreementTemplateSchema))
    body: UpdateAgreementTemplateInput,
  ) {
    return this.agreementTemplatesService.update(id, body);
  }

  @Patch(':id/move')
  async move(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveAgreementTemplateSchema))
    body: MoveAgreementTemplateInput,
  ) {
    return this.agreementTemplatesService.move(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.agreementTemplatesService.remove(id);
  }
}
