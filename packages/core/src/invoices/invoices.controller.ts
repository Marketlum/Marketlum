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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { InvoiceImportService } from './invoice-import.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  paginationQuerySchema,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  PaginationQuery,
} from '@marketlum/shared';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceResponseDto,
  InvoiceImportResponseDto,
} from './invoice.dto';

@ApiTags('invoices')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(InvoiceResponseDto)
@Controller('invoices')
@UseGuards(AdminGuard)
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly invoiceImportService: InvoiceImportService,
  ) {}

  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Extract invoice fields from a PDF and stage them for create' })
  @ApiCreatedResponse({ type: InvoiceImportResponseDto })
  @ApiBadRequestResponse({ description: 'No file uploaded' })
  async import(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new (await import('@nestjs/common')).BadRequestException('No file uploaded');
    }
    return this.invoiceImportService.import(
      file.buffer,
      file.mimetype,
      file.originalname,
      file.size,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an invoice' })
  @ApiBody({ type: CreateInvoiceDto })
  @ApiCreatedResponse({ type: InvoiceResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createInvoiceSchema)) body: CreateInvoiceInput,
  ) {
    return this.invoicesService.create(body);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search and paginate invoices' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'fromAgentId', required: false, type: String })
  @ApiQuery({ name: 'toAgentId', required: false, type: String })
  @ApiQuery({ name: 'paid', required: false, enum: ['true', 'false'] })
  @ApiQuery({ name: 'currencyId', required: false, type: String })
  @ApiQuery({ name: 'channelId', required: false, type: String })
  @ApiPaginatedResponse(InvoiceResponseDto)
  async search(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('fromAgentId') fromAgentId?: string,
    @Query('toAgentId') toAgentId?: string,
    @Query('paid') paid?: string,
    @Query('currencyId') currencyId?: string,
    @Query('channelId') channelId?: string,
  ) {
    return this.invoicesService.search({
      ...query,
      fromAgentId,
      toAgentId,
      paid,
      currencyId,
      channelId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an invoice by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice UUID' })
  @ApiOkResponse({ type: InvoiceResponseDto })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  async findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an invoice' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice UUID' })
  @ApiBody({ type: UpdateInvoiceDto })
  @ApiOkResponse({ type: InvoiceResponseDto })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateInvoiceSchema)) body: UpdateInvoiceInput,
  ) {
    return this.invoicesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an invoice' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice UUID' })
  @ApiNoContentResponse({ description: 'Invoice deleted' })
  @ApiNotFoundResponse({ description: 'Invoice not found' })
  async remove(@Param('id') id: string) {
    await this.invoicesService.remove(id);
  }
}
