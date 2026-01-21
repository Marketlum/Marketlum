import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { OfferingsService } from './offerings.service';
import { CreateOfferingDto } from './dto/create-offering.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';
import { CreateOfferingItemDto } from './dto/create-offering-item.dto';
import { UpdateOfferingItemDto } from './dto/update-offering-item.dto';
import { TransitionOfferingDto } from './dto/transition-offering.dto';
import { OfferingState } from './entities/offering.entity';

@ApiTags('Offerings')
@Controller('offerings')
export class OfferingsController {
  constructor(private readonly offeringsService: OfferingsService) {}

  // ============= SEED (must be before :id routes) =============

  @Post('seed')
  @ApiOperation({ summary: 'Seed sample offerings data' })
  seed() {
    return this.offeringsService.seed();
  }

  // ============= OFFERINGS =============

  @Post()
  @ApiOperation({ summary: 'Create a new offering' })
  create(@Body() createOfferingDto: CreateOfferingDto) {
    return this.offeringsService.create(createOfferingDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all offerings with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search in name/description/purpose' })
  @ApiQuery({ name: 'state', required: false, enum: OfferingState })
  @ApiQuery({ name: 'agentId', required: false, type: String })
  @ApiQuery({ name: 'valueStreamId', required: false, type: String })
  @ApiQuery({ name: 'active', required: false, type: Boolean, description: 'Filter for currently active offerings' })
  @ApiQuery({ name: 'sort', required: false, type: String, description: 'e.g., updatedAt_desc, name_asc' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('q') q?: string,
    @Query('state') state?: OfferingState,
    @Query('agentId') agentId?: string,
    @Query('valueStreamId') valueStreamId?: string,
    @Query('active') active?: string,
    @Query('sort') sort?: string,
  ) {
    return this.offeringsService.findAll(
      {
        q,
        state,
        agentId,
        valueStreamId,
        active: active === 'true',
        sort,
      },
      { page, limit },
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single offering by ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.offeringsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an offering' })
  @ApiParam({ name: 'id', type: String })
  update(@Param('id') id: string, @Body() updateOfferingDto: UpdateOfferingDto) {
    return this.offeringsService.update(id, updateOfferingDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an offering (draft only)' })
  @ApiParam({ name: 'id', type: String })
  remove(@Param('id') id: string) {
    return this.offeringsService.remove(id);
  }

  // ============= STATE TRANSITIONS =============

  @Post(':id/transition')
  @ApiOperation({ summary: 'Transition offering to a new state' })
  @ApiParam({ name: 'id', type: String })
  transition(@Param('id') id: string, @Body() transitionDto: TransitionOfferingDto) {
    return this.offeringsService.transition(id, transitionDto);
  }

  // ============= OFFERING ITEMS =============

  @Post(':id/items')
  @ApiOperation({ summary: 'Add an item to an offering' })
  @ApiParam({ name: 'id', type: String })
  addItem(@Param('id') id: string, @Body() createItemDto: CreateOfferingItemDto) {
    return this.offeringsService.addItem(id, createItemDto);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Update an offering item' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'itemId', type: String })
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() updateItemDto: UpdateOfferingItemDto,
  ) {
    return this.offeringsService.updateItem(id, itemId, updateItemDto);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Remove an item from an offering' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'itemId', type: String })
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.offeringsService.removeItem(id, itemId);
  }

  // ============= OFFERING FILES =============

  @Post(':id/files')
  @ApiOperation({ summary: 'Attach a file to an offering' })
  @ApiParam({ name: 'id', type: String })
  attachFile(@Param('id') id: string, @Body('fileId') fileId: string) {
    return this.offeringsService.attachFile(id, fileId);
  }

  @Delete(':id/files/:fileId')
  @ApiOperation({ summary: 'Remove a file from an offering' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'fileId', type: String })
  removeFile(@Param('id') id: string, @Param('fileId') fileId: string) {
    return this.offeringsService.removeFile(id, fileId);
  }
}
