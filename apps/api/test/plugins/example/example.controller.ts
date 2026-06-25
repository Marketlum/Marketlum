import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminGuard } from '@marketlum/core';
import { Widget } from './widget.entity';

/** Test-only controller mounted by the example plugin under /plugins/example. */
@Controller('plugins/example')
@UseGuards(AdminGuard)
export class ExampleController {
  constructor(
    @InjectRepository(Widget)
    private readonly widgets: Repository<Widget>,
  ) {}

  @Get('ping')
  ping() {
    return { ok: true };
  }

  @Post('widgets')
  async create(@Body() body: { name?: string; code?: string }) {
    const widget = this.widgets.create({
      name: body?.name ?? 'widget',
      code: body?.code ?? null,
    });
    return this.widgets.save(widget);
  }

  @Patch('widgets/:id')
  async update(@Param('id') id: string, @Body() body: { name?: string }) {
    const widget = await this.widgets.findOne({ where: { id } });
    if (!widget) throw new NotFoundException('Widget not found');
    if (body?.name !== undefined) widget.name = body.name;
    return this.widgets.save(widget);
  }

  @Delete('widgets/:id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    const widget = await this.widgets.findOne({ where: { id } });
    if (!widget) throw new NotFoundException('Widget not found');
    await this.widgets.remove(widget);
  }
}
