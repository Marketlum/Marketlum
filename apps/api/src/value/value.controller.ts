import { Controller, Get, Post, Body, Patch, Param, Delete, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ValueService } from './value.service';
import { CreateValueDto } from './dto/create-value.dto';
import { UpdateValueDto } from './dto/update-value.dto';
import { Pagination } from 'nestjs-typeorm-paginate';
import { Value } from './entities/value.entity';

@Controller('value')
export class ValueController {
  constructor(private readonly valueService: ValueService) {}

  @Post()
  create(@Body() createValueDto: CreateValueDto) {
    return this.valueService.create(createValueDto);
  }

  @Get()
  findAll() {
    return this.valueService.findAll();
  }

  @Get('list')
  async list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ): Promise<Pagination<Value>> {
    limit = limit > 100 ? 100 : limit;
    return this.valueService.paginate({
      page,
      limit,
      route: 'http://localhost:3001/value/list',
    });
  }

  @Get('flat/:streamId')
  findFlat(@Param('streamId') streamId: string) {
    return this.valueService.findFlat(streamId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.valueService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateValueDto: UpdateValueDto) {
    return this.valueService.update(id, updateValueDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.valueService.remove(id);
  }

  @Post('seed')
  seed() {
    return this.valueService.seed();
  }
}
