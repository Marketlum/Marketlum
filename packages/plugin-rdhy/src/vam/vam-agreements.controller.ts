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
  createVamAgreementSchema,
  updateVamAgreementSchema,
  vamCanvasSchema,
  terminateVamAgreementSchema,
  CreateVamAgreementInput,
  UpdateVamAgreementInput,
  VamCanvasInput,
  TerminateVamAgreementInput,
} from '../shared/vam-schemas';
import { VamAgreementsService } from './vam-agreements.service';

@Controller('plugins/rdhy/vam-agreements')
@UseGuards(AdminGuard)
export class VamAgreementsController {
  constructor(private readonly vamAgreements: VamAgreementsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createVamAgreementSchema)) body: CreateVamAgreementInput,
  ) {
    return this.vamAgreements.create(body);
  }

  @Get()
  async findAll() {
    return this.vamAgreements.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.vamAgreements.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateVamAgreementSchema)) body: UpdateVamAgreementInput,
  ) {
    return this.vamAgreements.updateMetadata(id, body);
  }

  @Put(':id/canvas')
  async replaceCanvas(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(vamCanvasSchema)) body: VamCanvasInput,
  ) {
    return this.vamAgreements.replaceCanvas(id, body);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string) {
    return this.vamAgreements.activate(id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  async complete(@Param('id') id: string) {
    return this.vamAgreements.complete(id);
  }

  @Post(':id/terminate')
  @HttpCode(HttpStatus.OK)
  async terminate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(terminateVamAgreementSchema)) body: TerminateVamAgreementInput,
  ) {
    return this.vamAgreements.terminate(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.vamAgreements.remove(id);
  }
}
