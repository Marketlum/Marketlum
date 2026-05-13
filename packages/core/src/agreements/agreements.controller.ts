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
import { AgreementsService } from './agreements.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
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
import {
  CreateAgreementDto,
  UpdateAgreementDto,
  MoveAgreementDto,
  AgreementResponseDto,
} from './agreement.dto';

@ApiTags('agreements')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(AgreementResponseDto)
@Controller('agreements')
@UseGuards(AdminGuard)
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an agreement' })
  @ApiBody({ type: CreateAgreementDto })
  @ApiCreatedResponse({ type: AgreementResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createAgreementSchema)) body: CreateAgreementInput,
  ) {
    return this.agreementsService.create(body);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search and paginate agreements' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'partyId', required: false, type: String })
  @ApiQuery({ name: 'valueStreamId', required: false, type: String })
  @ApiPaginatedResponse(AgreementResponseDto)
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('partyId') partyId?: string,
    @Query('valueStreamId') valueStreamId?: string,
  ) {
    return this.agreementsService.search({ ...query, partyId, valueStreamId });
  }

  @Get('tree')
  @ApiOperation({ summary: 'Full agreement tree' })
  async findTree() {
    return this.agreementsService.findTree();
  }

  @Get('roots')
  @ApiOperation({ summary: 'Top-level agreements' })
  @ApiOkResponse({ type: AgreementResponseDto, isArray: true })
  async findRoots() {
    return this.agreementsService.findRoots();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an agreement by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Agreement UUID' })
  @ApiOkResponse({ type: AgreementResponseDto })
  @ApiNotFoundResponse({ description: 'Agreement not found' })
  async findOne(@Param('id') id: string) {
    return this.agreementsService.findOne(id);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Direct children of an agreement' })
  @ApiParam({ name: 'id', type: String, description: 'Agreement UUID' })
  @ApiOkResponse({ type: AgreementResponseDto, isArray: true })
  async findChildren(@Param('id') id: string) {
    return this.agreementsService.findChildren(id);
  }

  @Get(':id/descendants')
  @ApiOperation({ summary: 'Descendant tree rooted at an agreement' })
  @ApiParam({ name: 'id', type: String, description: 'Agreement UUID' })
  async findDescendantsTree(@Param('id') id: string) {
    return this.agreementsService.findDescendantsTree(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an agreement' })
  @ApiParam({ name: 'id', type: String, description: 'Agreement UUID' })
  @ApiBody({ type: UpdateAgreementDto })
  @ApiOkResponse({ type: AgreementResponseDto })
  @ApiNotFoundResponse({ description: 'Agreement not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAgreementSchema)) body: UpdateAgreementInput,
  ) {
    return this.agreementsService.update(id, body);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Move an agreement under a different parent' })
  @ApiParam({ name: 'id', type: String, description: 'Agreement UUID' })
  @ApiBody({ type: MoveAgreementDto })
  @ApiOkResponse({ type: AgreementResponseDto })
  @ApiNotFoundResponse({ description: 'Agreement not found' })
  async move(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveAgreementSchema)) body: MoveAgreementInput,
  ) {
    return this.agreementsService.move(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an agreement' })
  @ApiParam({ name: 'id', type: String, description: 'Agreement UUID' })
  @ApiNoContentResponse({ description: 'Agreement deleted' })
  @ApiNotFoundResponse({ description: 'Agreement not found' })
  async remove(@Param('id') id: string) {
    await this.agreementsService.remove(id);
  }
}
