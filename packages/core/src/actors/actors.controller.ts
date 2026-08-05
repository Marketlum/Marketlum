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
import { ActorsService } from './actors.service';
import { AddressesService } from './addresses/addresses.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import {
  createActorSchema,
  updateActorSchema,
  moveActorSchema,
  createAddressSchema,
  updateAddressSchema,
  paginationQuerySchema,
  CreateActorInput,
  UpdateActorInput,
  MoveActorInput,
  CreateAddressInput,
  UpdateAddressInput,
  PaginationQuery,
  ActorType,
} from '@marketlum/shared';
import { CreateActorDto, UpdateActorDto, ActorResponseDto } from './actor.dto';
import {
  CreateAddressDto,
  UpdateAddressDto,
  AddressResponseDto,
} from './addresses/address.dto';

@ApiTags('actors')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(ActorResponseDto, AddressResponseDto)
@Controller('actors')
@UseGuards(AdminGuard)
export class ActorsController {
  constructor(
    private readonly actorsService: ActorsService,
    private readonly addressesService: AddressesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an actor' })
  @ApiBody({ type: CreateActorDto })
  @ApiCreatedResponse({ type: ActorResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createActorSchema)) body: CreateActorInput,
  ) {
    return this.actorsService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'List and paginate actors' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'type', required: false, enum: ActorType })
  @ApiQuery({ name: 'taxonomyId', required: false, type: String })
  @ApiPaginatedResponse(ActorResponseDto)
  async findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('type') type?: ActorType,
    @Query('taxonomyId') taxonomyId?: string,
  ) {
    return this.actorsService.findAll({ ...query, type, taxonomyId });
  }

  @Get('tree')
  @ApiOperation({ summary: 'Full actor forest as nested trees' })
  async findTree() {
    return this.actorsService.findTree();
  }

  @Get('roots')
  @ApiOperation({ summary: 'Root actors only' })
  @ApiOkResponse({ type: ActorResponseDto, isArray: true })
  async findRoots() {
    return this.actorsService.findRoots();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an actor by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Actor UUID' })
  @ApiOkResponse({ type: ActorResponseDto })
  @ApiNotFoundResponse({ description: 'Actor not found' })
  async findOne(@Param('id') id: string) {
    return this.actorsService.findOne(id);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Direct sub-actors of an actor' })
  @ApiParam({ name: 'id', type: String, description: 'Actor UUID' })
  @ApiOkResponse({ type: ActorResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Actor not found' })
  async findChildren(@Param('id') id: string) {
    return this.actorsService.findChildren(id);
  }

  @Get(':id/descendants')
  @ApiOperation({ summary: 'All descendants of an actor (flat list)' })
  @ApiParam({ name: 'id', type: String, description: 'Actor UUID' })
  @ApiOkResponse({ type: ActorResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Actor not found' })
  async findDescendants(@Param('id') id: string) {
    return this.actorsService.findDescendants(id);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Move an actor under a different parent (null = root)' })
  @ApiParam({ name: 'id', type: String, description: 'Actor UUID' })
  @ApiOkResponse({ type: ActorResponseDto })
  @ApiBadRequestResponse({ description: 'Move into itself or its own subtree' })
  @ApiNotFoundResponse({ description: 'Actor or parent not found' })
  async move(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveActorSchema)) body: MoveActorInput,
  ) {
    return this.actorsService.move(id, body);
  }

  @Get(':id/snapshot-references')
  @ApiOperation({
    summary: 'Count snapshot rows that reference this actor in either perspective',
  })
  @ApiParam({ name: 'id', type: String, description: 'Actor UUID' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        invoiceItems: { type: 'integer' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Actor not found' })
  async snapshotReferences(@Param('id') id: string) {
    return this.actorsService.getSnapshotReferences(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an actor' })
  @ApiParam({ name: 'id', type: String, description: 'Actor UUID' })
  @ApiBody({ type: UpdateActorDto })
  @ApiOkResponse({ type: ActorResponseDto })
  @ApiNotFoundResponse({ description: 'Actor not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateActorSchema)) body: UpdateActorInput,
  ) {
    return this.actorsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an actor' })
  @ApiParam({ name: 'id', type: String, description: 'Actor UUID' })
  @ApiNoContentResponse({ description: 'Actor deleted' })
  @ApiNotFoundResponse({ description: 'Actor not found' })
  async remove(@Param('id') id: string) {
    await this.actorsService.remove(id);
  }

  @Post(':actorId/addresses')
  @ApiOperation({ summary: 'Add an address to an actor' })
  @ApiParam({ name: 'actorId', type: String, description: 'Actor UUID' })
  @ApiBody({ type: CreateAddressDto })
  @ApiCreatedResponse({ type: AddressResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiNotFoundResponse({ description: 'Actor or country not found' })
  async createAddress(
    @Param('actorId') actorId: string,
    @Body(new ZodValidationPipe(createAddressSchema)) body: CreateAddressInput,
  ) {
    return this.addressesService.create(actorId, body);
  }

  @Get(':actorId/addresses')
  @ApiOperation({ summary: 'List addresses for an actor' })
  @ApiParam({ name: 'actorId', type: String, description: 'Actor UUID' })
  @ApiOkResponse({ type: AddressResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Actor not found' })
  async findAddresses(@Param('actorId') actorId: string) {
    return this.addressesService.findAllForActor(actorId);
  }

  @Get(':actorId/addresses/:id')
  @ApiOperation({ summary: 'Get a single address' })
  @ApiParam({ name: 'actorId', type: String, description: 'Actor UUID' })
  @ApiParam({ name: 'id', type: String, description: 'Address UUID' })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Address not found' })
  async findAddress(
    @Param('actorId') actorId: string,
    @Param('id') id: string,
  ) {
    return this.addressesService.findOne(actorId, id);
  }

  @Patch(':actorId/addresses/:id')
  @ApiOperation({ summary: 'Update an address' })
  @ApiParam({ name: 'actorId', type: String, description: 'Actor UUID' })
  @ApiParam({ name: 'id', type: String, description: 'Address UUID' })
  @ApiBody({ type: UpdateAddressDto })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Address or country not found' })
  async updateAddress(
    @Param('actorId') actorId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAddressSchema)) body: UpdateAddressInput,
  ) {
    return this.addressesService.update(actorId, id, body);
  }

  @Delete(':actorId/addresses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an address' })
  @ApiParam({ name: 'actorId', type: String, description: 'Actor UUID' })
  @ApiParam({ name: 'id', type: String, description: 'Address UUID' })
  @ApiNoContentResponse({ description: 'Address deleted' })
  @ApiNotFoundResponse({ description: 'Address not found' })
  async removeAddress(
    @Param('actorId') actorId: string,
    @Param('id') id: string,
  ) {
    await this.addressesService.remove(actorId, id);
  }
}
