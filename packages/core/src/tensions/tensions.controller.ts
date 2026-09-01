import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
  ApiExtraModels,
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { TensionsService } from './tensions.service';
import { TensionHistoryService } from './tension-history.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createTensionSchema,
  renameTensionSchema,
  rescoreTensionSchema,
  reviseTensionContextSchema,
  assignTensionLeadSchema,
  reassignTensionSchema,
  paginationQuerySchema,
  CreateTensionInput,
  RenameTensionInput,
  RescoreTensionInput,
  ReviseTensionContextInput,
  AssignTensionLeadInput,
  ReassignTensionInput,
  PaginationQuery,
} from '@marketlum/shared';
import {
  SenseTensionCommand,
  RenameTensionCommand,
  RescoreTensionCommand,
  ReviseTensionContextCommand,
  AssignTensionLeadCommand,
  ReassignTensionCommand,
  ResolveTensionCommand,
  DropTensionCommand,
  ReopenTensionCommand,
  ReviveTensionCommand,
  DiscardTensionCommand,
} from './commands';
import {
  CreateTensionDto,
  RenameTensionDto,
  RescoreTensionDto,
  ReviseTensionContextDto,
  AssignTensionLeadDto,
  ReassignTensionDto,
  TensionResponseDto,
} from './tension.dto';

/**
 * Command-oriented REST surface for the event-sourced Tension aggregate
 * (spec 027 §5). `PATCH /tensions/:id` and `POST /tensions/:id/transitions`
 * were removed in favour of one endpoint per command.
 */
@ApiTags('tensions')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiConflictResponse({ description: 'The tension changed concurrently; reload and retry' })
@ApiExtraModels(TensionResponseDto)
@Controller('tensions')
@UseGuards(AdminGuard)
export class TensionsController {
  constructor(
    private readonly tensionsService: TensionsService,
    private readonly historyService: TensionHistoryService,
    private readonly commandBus: CommandBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Sense a tension' })
  @ApiBody({ type: CreateTensionDto })
  @ApiCreatedResponse({ description: 'Tension sensed', type: TensionResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiNotFoundResponse({ description: 'Referenced actor or lead user not found' })
  async sense(@Body(new ZodValidationPipe(createTensionSchema)) body: CreateTensionInput) {
    const id = await this.commandBus.execute<SenseTensionCommand, string>(
      new SenseTensionCommand(body),
    );
    return this.tensionsService.findOne(id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search and paginate tensions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Full-text search query' })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'actorId', required: false, type: String })
  @ApiQuery({ name: 'leadUserId', required: false, type: String })
  @ApiQuery({ name: 'state', required: false, enum: ['alive', 'resolved', 'stale'] })
  @ApiPaginatedResponse(TensionResponseDto)
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('actorId') actorId?: string,
    @Query('leadUserId') leadUserId?: string,
    @Query('state') state?: string,
  ) {
    return this.tensionsService.search({ ...query, actorId, leadUserId, state });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tension by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: TensionResponseDto })
  @ApiNotFoundResponse({ description: 'Tension not found' })
  async findOne(@Param('id') id: string) {
    return this.tensionsService.findOne(id);
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'Rendered timeline of a tension',
    description:
      'Newest first. Each entry carries an English summary plus summaryKey/summaryParams for localisation.',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ description: 'Paginated timeline entries' })
  @ApiNotFoundResponse({ description: 'Tension not found' })
  async history(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.historyService.findForTension(id, query);
  }

  @Post(':id/rename')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rename a tension' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({ type: RenameTensionDto })
  @ApiOkResponse({ type: TensionResponseDto })
  async rename(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(renameTensionSchema)) body: RenameTensionInput,
  ) {
    await this.commandBus.execute(new RenameTensionCommand(id, body.name));
    return this.tensionsService.findOne(id);
  }

  @Post(':id/rescore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rescore a tension' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({ type: RescoreTensionDto })
  @ApiOkResponse({ type: TensionResponseDto })
  async rescore(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rescoreTensionSchema)) body: RescoreTensionInput,
  ) {
    await this.commandBus.execute(new RescoreTensionCommand(id, body.score));
    return this.tensionsService.findOne(id);
  }

  @Post(':id/revise')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revise a tension’s current context and/or potential future' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({ type: ReviseTensionContextDto })
  @ApiOkResponse({ type: TensionResponseDto })
  async revise(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reviseTensionContextSchema)) body: ReviseTensionContextInput,
  ) {
    await this.commandBus.execute(
      new ReviseTensionContextCommand(id, body.currentContext, body.potentialFuture),
    );
    return this.tensionsService.findOne(id);
  }

  @Post(':id/lead')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign or unassign the tension lead (null unassigns)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({ type: AssignTensionLeadDto })
  @ApiOkResponse({ type: TensionResponseDto })
  async assignLead(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(assignTensionLeadSchema)) body: AssignTensionLeadInput,
  ) {
    await this.commandBus.execute(new AssignTensionLeadCommand(id, body.leadUserId));
    return this.tensionsService.findOne(id);
  }

  @Post(':id/reassign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reassign a tension to a different actor' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({ type: ReassignTensionDto })
  @ApiOkResponse({ type: TensionResponseDto })
  async reassign(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reassignTensionSchema)) body: ReassignTensionInput,
  ) {
    await this.commandBus.execute(new ReassignTensionCommand(id, body.actorId));
    return this.tensionsService.findOne(id);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve an alive tension' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: TensionResponseDto })
  @ApiBadRequestResponse({ description: 'Not allowed from the current state' })
  async resolve(@Param('id') id: string) {
    await this.commandBus.execute(new ResolveTensionCommand(id));
    return this.tensionsService.findOne(id);
  }

  @Post(':id/drop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Drop an alive tension as stale' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: TensionResponseDto })
  @ApiBadRequestResponse({ description: 'Not allowed from the current state' })
  async drop(@Param('id') id: string) {
    await this.commandBus.execute(new DropTensionCommand(id));
    return this.tensionsService.findOne(id);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reopen a resolved tension' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: TensionResponseDto })
  @ApiBadRequestResponse({ description: 'Not allowed from the current state' })
  async reopen(@Param('id') id: string) {
    await this.commandBus.execute(new ReopenTensionCommand(id));
    return this.tensionsService.findOne(id);
  }

  @Post(':id/revive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revive a stale tension' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: TensionResponseDto })
  @ApiBadRequestResponse({ description: 'Not allowed from the current state' })
  async revive(@Param('id') id: string) {
    await this.commandBus.execute(new ReviveTensionCommand(id));
    return this.tensionsService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Discard a tension',
    description: 'Removes the projection row; the event stream is retained.',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiNoContentResponse({ description: 'Tension discarded' })
  @ApiNotFoundResponse({ description: 'Tension not found' })
  async discard(@Param('id') id: string) {
    await this.commandBus.execute(new DiscardTensionCommand(id));
  }
}
