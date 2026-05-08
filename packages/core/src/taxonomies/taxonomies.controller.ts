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
import { TaxonomiesService } from './taxonomies.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import {
  createTaxonomySchema,
  updateTaxonomySchema,
  moveTaxonomySchema,
  paginationQuerySchema,
  CreateTaxonomyInput,
  UpdateTaxonomyInput,
  MoveTaxonomyInput,
  PaginationQuery,
} from '@marketlum/shared';
import {
  CreateTaxonomyDto,
  UpdateTaxonomyDto,
  MoveTaxonomyDto,
  TaxonomyResponseDto,
} from './taxonomy.dto';

@ApiTags('taxonomies')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(TaxonomyResponseDto)
@Controller('taxonomies')
@UseGuards(AdminGuard)
export class TaxonomiesController {
  constructor(private readonly taxonomiesService: TaxonomiesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a taxonomy node' })
  @ApiBody({ type: CreateTaxonomyDto })
  @ApiCreatedResponse({ type: TaxonomyResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createTaxonomySchema)) body: CreateTaxonomyInput,
  ) {
    return this.taxonomiesService.create(body);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search and paginate taxonomy nodes' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiPaginatedResponse(TaxonomyResponseDto)
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.taxonomiesService.search(query);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Full taxonomy tree' })
  @ApiOkResponse({ description: 'Nested tree of taxonomy nodes' })
  async findTree() {
    return this.taxonomiesService.findTree();
  }

  @Get('roots')
  @ApiOperation({ summary: 'Top-level taxonomy nodes' })
  @ApiOkResponse({ type: TaxonomyResponseDto, isArray: true })
  async findRoots() {
    return this.taxonomiesService.findRoots();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a taxonomy node by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Taxonomy UUID' })
  @ApiOkResponse({ type: TaxonomyResponseDto })
  @ApiNotFoundResponse({ description: 'Taxonomy not found' })
  async findOne(@Param('id') id: string) {
    return this.taxonomiesService.findOne(id);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Direct children of a taxonomy node' })
  @ApiParam({ name: 'id', type: String, description: 'Taxonomy UUID' })
  @ApiOkResponse({ type: TaxonomyResponseDto, isArray: true })
  async findChildren(@Param('id') id: string) {
    return this.taxonomiesService.findChildren(id);
  }

  @Get(':id/descendants')
  @ApiOperation({ summary: 'Descendant tree rooted at a taxonomy node' })
  @ApiParam({ name: 'id', type: String, description: 'Taxonomy UUID' })
  async findDescendantsTree(@Param('id') id: string) {
    return this.taxonomiesService.findDescendantsTree(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a taxonomy node' })
  @ApiParam({ name: 'id', type: String, description: 'Taxonomy UUID' })
  @ApiBody({ type: UpdateTaxonomyDto })
  @ApiOkResponse({ type: TaxonomyResponseDto })
  @ApiNotFoundResponse({ description: 'Taxonomy not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTaxonomySchema)) body: UpdateTaxonomyInput,
  ) {
    return this.taxonomiesService.update(id, body);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Move a taxonomy node under a different parent' })
  @ApiParam({ name: 'id', type: String, description: 'Taxonomy UUID' })
  @ApiBody({ type: MoveTaxonomyDto })
  @ApiOkResponse({ type: TaxonomyResponseDto })
  @ApiNotFoundResponse({ description: 'Taxonomy not found' })
  async move(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveTaxonomySchema)) body: MoveTaxonomyInput,
  ) {
    return this.taxonomiesService.move(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a taxonomy node' })
  @ApiParam({ name: 'id', type: String, description: 'Taxonomy UUID' })
  @ApiNoContentResponse({ description: 'Taxonomy deleted' })
  @ApiNotFoundResponse({ description: 'Taxonomy not found' })
  async remove(@Param('id') id: string) {
    await this.taxonomiesService.remove(id);
  }
}
