import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreateInvoiceItemDto } from './dto/create-invoice-item.dto';
import { UpdateInvoiceItemDto } from './dto/update-invoice-item.dto';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices with pagination and filtering' })
  @ApiQuery({ name: 'q', required: false, description: 'Search by number, note' })
  @ApiQuery({ name: 'fromAgentId', required: false })
  @ApiQuery({ name: 'toAgentId', required: false })
  @ApiQuery({ name: 'issuedFrom', required: false, description: 'Filter by issued date (from)' })
  @ApiQuery({ name: 'issuedTo', required: false, description: 'Filter by issued date (to)' })
  @ApiQuery({ name: 'dueFrom', required: false, description: 'Filter by due date (from)' })
  @ApiQuery({ name: 'dueTo', required: false, description: 'Filter by due date (to)' })
  @ApiQuery({ name: 'hasFile', required: false, description: 'Filter by file attachment' })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort: issuedAt_desc, dueAt_asc, number_asc, updatedAt_desc' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @Query('q') q?: string,
    @Query('fromAgentId') fromAgentId?: string,
    @Query('toAgentId') toAgentId?: string,
    @Query('issuedFrom') issuedFrom?: string,
    @Query('issuedTo') issuedTo?: string,
    @Query('dueFrom') dueFrom?: string,
    @Query('dueTo') dueTo?: string,
    @Query('hasFile') hasFile?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.invoicesService.findAll({
      q,
      fromAgentId,
      toAgentId,
      issuedFrom,
      issuedTo,
      dueFrom,
      dueTo,
      hasFile: hasFile === 'true' ? true : hasFile === 'false' ? false : undefined,
      sort,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed sample invoices' })
  seed() {
    return this.invoicesService.seed();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an invoice by ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  create(@Body() createDto: CreateInvoiceDto) {
    return this.invoicesService.create(createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an invoice' })
  @ApiParam({ name: 'id', type: String })
  update(@Param('id') id: string, @Body() updateDto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an invoice' })
  @ApiParam({ name: 'id', type: String })
  delete(@Param('id') id: string) {
    return this.invoicesService.delete(id);
  }

  // Invoice Items
  @Post(':id/items')
  @ApiOperation({ summary: 'Add an item to an invoice' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice ID' })
  addItem(@Param('id') id: string, @Body() createDto: CreateInvoiceItemDto) {
    return this.invoicesService.addItem(id, createDto);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Update an invoice item' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice ID' })
  @ApiParam({ name: 'itemId', type: String, description: 'Item ID' })
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() updateDto: UpdateInvoiceItemDto,
  ) {
    return this.invoicesService.updateItem(id, itemId, updateDto);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Remove an item from an invoice' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice ID' })
  @ApiParam({ name: 'itemId', type: String, description: 'Item ID' })
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.invoicesService.removeItem(id, itemId);
  }
}
