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
import { OfferingsService } from './offerings.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import {
  createOfferingSchema,
  updateOfferingSchema,
  paginationQuerySchema,
  CreateOfferingInput,
  UpdateOfferingInput,
  PaginationQuery,
  OfferingState,
} from '@marketlum/shared';
import {
  CreateOfferingDto,
  UpdateOfferingDto,
  OfferingResponseDto,
} from './offering.dto';

@ApiTags('offerings')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(OfferingResponseDto)
@Controller('offerings')
@UseGuards(AdminGuard)
export class OfferingsController {
  constructor(private readonly offeringsService: OfferingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an offering' })
  @ApiBody({ type: CreateOfferingDto })
  @ApiCreatedResponse({ type: OfferingResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createOfferingSchema)) body: CreateOfferingInput,
  ) {
    return this.offeringsService.create(body);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search and paginate offerings' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'state', required: false, enum: OfferingState })
  @ApiQuery({ name: 'agentId', required: false, type: String })
  @ApiQuery({ name: 'valueStreamId', required: false, type: String })
  @ApiPaginatedResponse(OfferingResponseDto)
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('state') state?: string,
    @Query('agentId') agentId?: string,
    @Query('valueStreamId') valueStreamId?: string,
  ) {
    return this.offeringsService.search({ ...query, state, agentId, valueStreamId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an offering by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Offering UUID' })
  @ApiOkResponse({ type: OfferingResponseDto })
  @ApiNotFoundResponse({ description: 'Offering not found' })
  async findOne(@Param('id') id: string) {
    return this.offeringsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an offering' })
  @ApiParam({ name: 'id', type: String, description: 'Offering UUID' })
  @ApiBody({ type: UpdateOfferingDto })
  @ApiOkResponse({ type: OfferingResponseDto })
  @ApiNotFoundResponse({ description: 'Offering not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateOfferingSchema)) body: UpdateOfferingInput,
  ) {
    return this.offeringsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an offering' })
  @ApiParam({ name: 'id', type: String, description: 'Offering UUID' })
  @ApiNoContentResponse({ description: 'Offering deleted' })
  @ApiNotFoundResponse({ description: 'Offering not found' })
  async remove(@Param('id') id: string) {
    await this.offeringsService.remove(id);
  }
}
