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
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createAgentSchema,
  updateAgentSchema,
  paginationQuerySchema,
  CreateAgentInput,
  UpdateAgentInput,
  PaginationQuery,
  AgentType,
} from '@marketlum/shared';

@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createAgentSchema)) body: CreateAgentInput,
  ) {
    return this.agentsService.create(body);
  }

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('type') type?: AgentType,
  ) {
    return this.agentsService.findAll({ ...query, type });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAgentSchema)) body: UpdateAgentInput,
  ) {
    return this.agentsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.agentsService.remove(id);
  }
}
