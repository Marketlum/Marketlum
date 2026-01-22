import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ValueInstancesService, TreeNode } from './value-instances.service';
import { CreateValueInstanceDto } from './dto/create-value-instance.dto';
import { UpdateValueInstanceDto } from './dto/update-value-instance.dto';
import { ValueInstance, ValueInstanceDirection, ValueInstanceVisibility } from './entities/value-instance.entity';

@ApiTags('Value Instances')
@Controller('value-instances')
export class ValueInstancesController {
  constructor(private readonly valueInstancesService: ValueInstancesService) {}

  @Get()
  @ApiOperation({ summary: 'List value instances with pagination and filtering' })
  @ApiQuery({ name: 'q', required: false, description: 'Search in name/purpose' })
  @ApiQuery({ name: 'valueId', required: false })
  @ApiQuery({ name: 'fromAgentId', required: false })
  @ApiQuery({ name: 'toAgentId', required: false })
  @ApiQuery({ name: 'direction', required: false, enum: ValueInstanceDirection })
  @ApiQuery({ name: 'visibility', required: false, enum: ValueInstanceVisibility })
  @ApiQuery({ name: 'parentId', required: false, description: 'Filter by parent (use "null" for root instances)' })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort field: updatedAt_desc, createdAt_desc, name_asc, version_desc' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @Query('q') q?: string,
    @Query('valueId') valueId?: string,
    @Query('fromAgentId') fromAgentId?: string,
    @Query('toAgentId') toAgentId?: string,
    @Query('direction') direction?: ValueInstanceDirection,
    @Query('visibility') visibility?: ValueInstanceVisibility,
    @Query('parentId') parentId?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.valueInstancesService.findAll({
      q,
      valueId,
      fromAgentId,
      toAgentId,
      direction,
      visibility,
      parentId: parentId === 'null' ? null : parentId,
      sort,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get hierarchical tree view of instances' })
  @ApiQuery({ name: 'valueId', required: false })
  @ApiQuery({ name: 'visibility', required: false, enum: ValueInstanceVisibility })
  getTree(
    @Query('valueId') valueId?: string,
    @Query('visibility') visibility?: ValueInstanceVisibility,
  ): Promise<TreeNode[]> {
    return this.valueInstancesService.getTree({ valueId, visibility });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a value instance by ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.valueInstancesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new value instance' })
  create(@Body() createDto: CreateValueInstanceDto) {
    return this.valueInstancesService.create(createDto);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed sample value instances' })
  seed() {
    return this.valueInstancesService.seed();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a value instance' })
  @ApiParam({ name: 'id', type: String })
  update(@Param('id') id: string, @Body() updateDto: UpdateValueInstanceDto) {
    return this.valueInstancesService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a value instance' })
  @ApiParam({ name: 'id', type: String })
  delete(@Param('id') id: string) {
    return this.valueInstancesService.delete(id);
  }
}
