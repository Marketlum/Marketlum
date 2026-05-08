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
import { AgentsService } from './agents.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import {
  createAgentSchema,
  updateAgentSchema,
  paginationQuerySchema,
  CreateAgentInput,
  UpdateAgentInput,
  PaginationQuery,
  AgentType,
} from '@marketlum/shared';
import { CreateAgentDto, UpdateAgentDto, AgentResponseDto } from './agent.dto';

@ApiTags('agents')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(AgentResponseDto)
@Controller('agents')
@UseGuards(AdminGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an agent' })
  @ApiBody({ type: CreateAgentDto })
  @ApiCreatedResponse({ type: AgentResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createAgentSchema)) body: CreateAgentInput,
  ) {
    return this.agentsService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'List and paginate agents' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'type', required: false, enum: AgentType })
  @ApiQuery({ name: 'taxonomyId', required: false, type: String })
  @ApiPaginatedResponse(AgentResponseDto)
  async findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('type') type?: AgentType,
    @Query('taxonomyId') taxonomyId?: string,
  ) {
    return this.agentsService.findAll({ ...query, type, taxonomyId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an agent by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Agent UUID' })
  @ApiOkResponse({ type: AgentResponseDto })
  @ApiNotFoundResponse({ description: 'Agent not found' })
  async findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an agent' })
  @ApiParam({ name: 'id', type: String, description: 'Agent UUID' })
  @ApiBody({ type: UpdateAgentDto })
  @ApiOkResponse({ type: AgentResponseDto })
  @ApiNotFoundResponse({ description: 'Agent not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAgentSchema)) body: UpdateAgentInput,
  ) {
    return this.agentsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an agent' })
  @ApiParam({ name: 'id', type: String, description: 'Agent UUID' })
  @ApiNoContentResponse({ description: 'Agent deleted' })
  @ApiNotFoundResponse({ description: 'Agent not found' })
  async remove(@Param('id') id: string) {
    await this.agentsService.remove(id);
  }
}
