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
import { ArchetypesService } from './archetypes.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import {
  createArchetypeSchema,
  updateArchetypeSchema,
  paginationQuerySchema,
  CreateArchetypeInput,
  UpdateArchetypeInput,
  PaginationQuery,
} from '@marketlum/shared';
import {
  CreateArchetypeDto,
  UpdateArchetypeDto,
  ArchetypeResponseDto,
} from './archetype.dto';

@ApiTags('archetypes')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(ArchetypeResponseDto)
@Controller('archetypes')
@UseGuards(AdminGuard)
export class ArchetypesController {
  constructor(private readonly archetypesService: ArchetypesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an archetype' })
  @ApiBody({ type: CreateArchetypeDto })
  @ApiCreatedResponse({ type: ArchetypeResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createArchetypeSchema)) body: CreateArchetypeInput,
  ) {
    return this.archetypesService.create(body);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search and paginate archetypes' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'taxonomyId', required: false, type: String })
  @ApiPaginatedResponse(ArchetypeResponseDto)
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('taxonomyId') taxonomyId?: string,
  ) {
    return this.archetypesService.search({ ...query, taxonomyId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an archetype by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Archetype UUID' })
  @ApiOkResponse({ type: ArchetypeResponseDto })
  @ApiNotFoundResponse({ description: 'Archetype not found' })
  async findOne(@Param('id') id: string) {
    return this.archetypesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an archetype' })
  @ApiParam({ name: 'id', type: String, description: 'Archetype UUID' })
  @ApiBody({ type: UpdateArchetypeDto })
  @ApiOkResponse({ type: ArchetypeResponseDto })
  @ApiNotFoundResponse({ description: 'Archetype not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateArchetypeSchema)) body: UpdateArchetypeInput,
  ) {
    return this.archetypesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an archetype' })
  @ApiParam({ name: 'id', type: String, description: 'Archetype UUID' })
  @ApiNoContentResponse({ description: 'Archetype deleted' })
  @ApiNotFoundResponse({ description: 'Archetype not found' })
  async remove(@Param('id') id: string) {
    await this.archetypesService.remove(id);
  }
}
