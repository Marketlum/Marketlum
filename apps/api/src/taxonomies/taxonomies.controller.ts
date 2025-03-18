import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TaxonomiesService } from './taxonomies.service';
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto';

@Controller('taxonomies')
export class TaxonomiesController {
  constructor(private readonly taxonomiesService: TaxonomiesService) {}

  @Post()
  create(@Body() createTaxonomyDto: CreateTaxonomyDto) {
    return this.taxonomiesService.create(createTaxonomyDto);
  }

  @Get()
  findAll() {
    return this.taxonomiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taxonomiesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaxonomyDto: UpdateTaxonomyDto) {
    return this.taxonomiesService.update(id, updateTaxonomyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.taxonomiesService.remove(id);
  }
}
