import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { GeographiesService } from './geographies.service';
import { CreateGeographyDto } from './dto/create-geography.dto';
import { UpdateGeographyDto } from './dto/update-geography.dto';
import { MoveGeographyDto } from './dto/move-geography.dto';
import { Geography } from './entities/geography.entity';

@Controller('geographies')
export class GeographiesController {
  constructor(private readonly geographiesService: GeographiesService) {}

  @Post()
  create(@Body() createGeographyDto: CreateGeographyDto): Promise<Geography> {
    return this.geographiesService.create(createGeographyDto);
  }

  @Get('tree')
  findTree(): Promise<Geography[]> {
    return this.geographiesService.findTree();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Geography | null> {
    return this.geographiesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateGeographyDto: UpdateGeographyDto,
  ): Promise<Geography> {
    return this.geographiesService.update(id, updateGeographyDto);
  }

  @Post(':id/move')
  move(
    @Param('id') id: string,
    @Body() moveGeographyDto: MoveGeographyDto,
  ): Promise<Geography> {
    return this.geographiesService.move(id, moveGeographyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.geographiesService.remove(id);
  }

  @Post('seed')
  seed(): Promise<{ inserted: number; skipped: number }> {
    return this.geographiesService.seed();
  }
}
