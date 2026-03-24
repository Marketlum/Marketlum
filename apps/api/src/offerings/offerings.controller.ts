import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OfferingsService } from './offerings.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createOfferingSchema,
  updateOfferingSchema,
  paginationQuerySchema,
  CreateOfferingInput,
  UpdateOfferingInput,
  PaginationQuery,
} from '@marketlum/shared';

@Controller('offerings')
@UseGuards(AdminGuard)
export class OfferingsController {
  constructor(private readonly offeringsService: OfferingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createOfferingSchema)) body: CreateOfferingInput,
  ) {
    return this.offeringsService.create(body);
  }

  @Get('search')
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('state') state?: string,
    @Query('agentId') agentId?: string,
    @Query('valueStreamId') valueStreamId?: string,
  ) {
    return this.offeringsService.search({ ...query, state, agentId, valueStreamId });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.offeringsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateOfferingSchema)) body: UpdateOfferingInput,
  ) {
    return this.offeringsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.offeringsService.remove(id);
  }
}
