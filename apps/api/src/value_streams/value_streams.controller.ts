import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ValueStreamsService } from './value_streams.service';
import { CreateValueStreamDto } from './dto/create-value_stream.dto';
import { UpdateValueStreamDto } from './dto/update-value_stream.dto';

@Controller('value-streams')
export class ValueStreamsController {
  constructor(private readonly valueStreamsService: ValueStreamsService) {}

  @Post()
  create(@Body() createValueStreamDto: CreateValueStreamDto) {
    return this.valueStreamsService.create(createValueStreamDto);
  }

  @Get()
  findAll() {
    return this.valueStreamsService.findAll();
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.valueStreamsService.getStats(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.valueStreamsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateValueStreamDto: UpdateValueStreamDto) {
    return this.valueStreamsService.update(id, updateValueStreamDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.valueStreamsService.remove(id);
  }
}
