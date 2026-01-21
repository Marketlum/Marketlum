import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LocalesService, LocalePaginatedResponse } from './locales.service';
import { CreateLocaleDto } from './dto/create-locale.dto';
import { UpdateLocaleDto } from './dto/update-locale.dto';
import { Locale } from './entities/locale.entity';

@Controller('locales')
export class LocalesController {
  constructor(private readonly localesService: LocalesService) {}

  @Post()
  create(@Body() createLocaleDto: CreateLocaleDto): Promise<Locale> {
    return this.localesService.create(createLocaleDto);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
  ): Promise<LocalePaginatedResponse> {
    return this.localesService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      q,
      sort,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Locale> {
    return this.localesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLocaleDto: UpdateLocaleDto,
  ): Promise<Locale> {
    return this.localesService.update(id, updateLocaleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.localesService.remove(id);
  }

  @Post('seed')
  seed(): Promise<{ inserted: number; skipped: number }> {
    return this.localesService.seed();
  }
}
