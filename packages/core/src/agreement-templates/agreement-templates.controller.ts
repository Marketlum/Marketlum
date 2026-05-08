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
  ApiExtraModels,
} from '@nestjs/swagger';
import { AgreementTemplatesService } from './agreement-templates.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import {
  createAgreementTemplateSchema,
  updateAgreementTemplateSchema,
  moveAgreementTemplateSchema,
  paginationQuerySchema,
  CreateAgreementTemplateInput,
  UpdateAgreementTemplateInput,
  MoveAgreementTemplateInput,
  PaginationQuery,
  AgreementTemplateType,
} from '@marketlum/shared';
import {
  CreateAgreementTemplateDto,
  UpdateAgreementTemplateDto,
  MoveAgreementTemplateDto,
  AgreementTemplateResponseDto,
} from './agreement-template.dto';

@ApiTags('agreement-templates')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(AgreementTemplateResponseDto)
@Controller('agreement-templates')
@UseGuards(AdminGuard)
export class AgreementTemplatesController {
  constructor(
    private readonly agreementTemplatesService: AgreementTemplatesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an agreement template' })
  @ApiBody({ type: CreateAgreementTemplateDto })
  @ApiCreatedResponse({ type: AgreementTemplateResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createAgreementTemplateSchema))
    body: CreateAgreementTemplateInput,
  ) {
    return this.agreementTemplatesService.create(body);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search and paginate agreement templates' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'type', required: false, enum: AgreementTemplateType })
  @ApiQuery({ name: 'valueStreamId', required: false, type: String })
  @ApiPaginatedResponse(AgreementTemplateResponseDto)
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('type') type?: string,
    @Query('valueStreamId') valueStreamId?: string,
  ) {
    return this.agreementTemplatesService.search({ ...query, type, valueStreamId });
  }

  @Get('tree')
  @ApiOperation({ summary: 'Full agreement-template tree' })
  async findTree() {
    return this.agreementTemplatesService.findTree();
  }

  @Get('roots')
  @ApiOperation({ summary: 'Top-level agreement templates' })
  @ApiOkResponse({ type: AgreementTemplateResponseDto, isArray: true })
  async findRoots() {
    return this.agreementTemplatesService.findRoots();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an agreement template by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Agreement template UUID' })
  @ApiOkResponse({ type: AgreementTemplateResponseDto })
  @ApiNotFoundResponse({ description: 'Agreement template not found' })
  async findOne(@Param('id') id: string) {
    return this.agreementTemplatesService.findOne(id);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Direct children of an agreement template' })
  @ApiParam({ name: 'id', type: String, description: 'Agreement template UUID' })
  @ApiOkResponse({ type: AgreementTemplateResponseDto, isArray: true })
  async findChildren(@Param('id') id: string) {
    return this.agreementTemplatesService.findChildren(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an agreement template' })
  @ApiParam({ name: 'id', type: String, description: 'Agreement template UUID' })
  @ApiBody({ type: UpdateAgreementTemplateDto })
  @ApiOkResponse({ type: AgreementTemplateResponseDto })
  @ApiNotFoundResponse({ description: 'Agreement template not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAgreementTemplateSchema))
    body: UpdateAgreementTemplateInput,
  ) {
    return this.agreementTemplatesService.update(id, body);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Move an agreement template under a different parent' })
  @ApiParam({ name: 'id', type: String, description: 'Agreement template UUID' })
  @ApiBody({ type: MoveAgreementTemplateDto })
  @ApiOkResponse({ type: AgreementTemplateResponseDto })
  @ApiNotFoundResponse({ description: 'Agreement template not found' })
  async move(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveAgreementTemplateSchema))
    body: MoveAgreementTemplateInput,
  ) {
    return this.agreementTemplatesService.move(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an agreement template' })
  @ApiParam({ name: 'id', type: String, description: 'Agreement template UUID' })
  @ApiNoContentResponse({ description: 'Agreement template deleted' })
  @ApiNotFoundResponse({ description: 'Agreement template not found' })
  async remove(@Param('id') id: string) {
    await this.agreementTemplatesService.remove(id);
  }
}
