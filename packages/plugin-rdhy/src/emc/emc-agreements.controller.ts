import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard, ZodValidationPipe } from '@marketlum/core';
import {
  createEmcAgreementSchema,
  updateEmcAgreementSchema,
  emcCanvasSchema,
  terminateEmcAgreementSchema,
  CreateEmcAgreementInput,
  UpdateEmcAgreementInput,
  EmcCanvasInput,
  TerminateEmcAgreementInput,
} from '../shared/emc-schemas';
import { EmcAgreementsService } from './emc-agreements.service';

@Controller('plugins/rdhy/emc-agreements')
@UseGuards(AdminGuard)
export class EmcAgreementsController {
  constructor(private readonly emcAgreements: EmcAgreementsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createEmcAgreementSchema)) body: CreateEmcAgreementInput,
  ) {
    return this.emcAgreements.create(body);
  }

  @Get()
  async findAll() {
    return this.emcAgreements.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.emcAgreements.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateEmcAgreementSchema)) body: UpdateEmcAgreementInput,
  ) {
    return this.emcAgreements.updateSetting(id, body);
  }

  @Put(':id/canvas')
  async replaceCanvas(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(emcCanvasSchema)) body: EmcCanvasInput,
  ) {
    return this.emcAgreements.replaceCanvas(id, body);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string) {
    return this.emcAgreements.activate(id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  async complete(@Param('id') id: string) {
    return this.emcAgreements.complete(id);
  }

  @Post(':id/terminate')
  @HttpCode(HttpStatus.OK)
  async terminate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(terminateEmcAgreementSchema)) body: TerminateEmcAgreementInput,
  ) {
    return this.emcAgreements.terminate(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.emcAgreements.remove(id);
  }
}
