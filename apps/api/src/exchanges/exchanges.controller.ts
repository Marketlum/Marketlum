import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ExchangesService } from './exchanges.service';
import { CreateExchangeDto } from './dto/create-exchange.dto';
import { UpdateExchangeDto } from './dto/update-exchange.dto';
import { TransitionExchangeDto } from './dto/transition-exchange.dto';
import { SetPartiesDto } from './dto/set-parties.dto';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { CreateAgreementFromExchangeDto } from './dto/create-agreement-from-exchange.dto';
import { ExchangeState } from './entities/exchange.entity';

@ApiTags('Exchanges')
@Controller('exchanges')
export class ExchangesController {
  constructor(private readonly exchangesService: ExchangesService) {}

  // ============= SEED (must be before :id routes) =============

  @Post('seed')
  @ApiOperation({ summary: 'Seed sample exchanges data' })
  seed() {
    return this.exchangesService.seed();
  }

  // ============= EXCHANGES CRUD =============

  @Post()
  @ApiOperation({ summary: 'Create a new exchange' })
  create(@Body() createExchangeDto: CreateExchangeDto) {
    return this.exchangesService.create(createExchangeDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all exchanges grouped by ValueStream' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search in name/purpose' })
  @ApiQuery({ name: 'state', required: false, enum: ExchangeState })
  @ApiQuery({ name: 'valueStreamId', required: false, type: String })
  @ApiQuery({ name: 'leadUserId', required: false, type: String })
  @ApiQuery({ name: 'channelId', required: false, type: String })
  @ApiQuery({ name: 'taxonId', required: false, type: String })
  @ApiQuery({ name: 'agentId', required: false, type: String, description: 'Filter by party agent' })
  @ApiQuery({ name: 'sort', required: false, type: String, description: 'e.g., updatedAt_desc, name_asc' })
  findAll(
    @Query('q') q?: string,
    @Query('state') state?: ExchangeState,
    @Query('valueStreamId') valueStreamId?: string,
    @Query('leadUserId') leadUserId?: string,
    @Query('channelId') channelId?: string,
    @Query('taxonId') taxonId?: string,
    @Query('agentId') agentId?: string,
    @Query('sort') sort?: string,
  ) {
    return this.exchangesService.findAll({
      q,
      state,
      valueStreamId,
      leadUserId,
      channelId,
      taxonId,
      agentId,
      sort,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single exchange by ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.exchangesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an exchange' })
  @ApiParam({ name: 'id', type: String })
  update(@Param('id') id: string, @Body() updateExchangeDto: UpdateExchangeDto) {
    return this.exchangesService.update(id, updateExchangeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an exchange (open state only)' })
  @ApiParam({ name: 'id', type: String })
  remove(@Param('id') id: string) {
    return this.exchangesService.remove(id);
  }

  // ============= STATE TRANSITIONS =============

  @Post(':id/transition')
  @ApiOperation({ summary: 'Transition exchange to a new state' })
  @ApiParam({ name: 'id', type: String })
  transition(@Param('id') id: string, @Body() transitionDto: TransitionExchangeDto) {
    return this.exchangesService.transition(id, transitionDto);
  }

  // ============= PARTIES MANAGEMENT =============

  @Put(':id/parties')
  @ApiOperation({ summary: 'Set exchange parties (replace all)' })
  @ApiParam({ name: 'id', type: String })
  setParties(@Param('id') id: string, @Body() setPartiesDto: SetPartiesDto) {
    return this.exchangesService.setParties(id, setPartiesDto);
  }

  // ============= FLOWS MANAGEMENT =============

  @Post(':id/flows')
  @ApiOperation({ summary: 'Create a new flow in an exchange' })
  @ApiParam({ name: 'id', type: String })
  createFlow(@Param('id') id: string, @Body() createFlowDto: CreateFlowDto) {
    return this.exchangesService.createFlow(id, createFlowDto);
  }

  @Patch(':id/flows/:flowId')
  @ApiOperation({ summary: 'Update a flow' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'flowId', type: String })
  updateFlow(
    @Param('id') id: string,
    @Param('flowId') flowId: string,
    @Body() updateFlowDto: UpdateFlowDto,
  ) {
    return this.exchangesService.updateFlow(id, flowId, updateFlowDto);
  }

  @Delete(':id/flows/:flowId')
  @ApiOperation({ summary: 'Delete a flow' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'flowId', type: String })
  removeFlow(@Param('id') id: string, @Param('flowId') flowId: string) {
    return this.exchangesService.removeFlow(id, flowId);
  }

  // ============= AGREEMENT CREATION =============

  @Post(':id/create-agreement')
  @ApiOperation({ summary: 'Create a new agreement from exchange' })
  @ApiParam({ name: 'id', type: String })
  createAgreement(
    @Param('id') id: string,
    @Body() createAgreementDto: CreateAgreementFromExchangeDto,
  ) {
    return this.exchangesService.createAgreementFromExchange(id, createAgreementDto);
  }
}
