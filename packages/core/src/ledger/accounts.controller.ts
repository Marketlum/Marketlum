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
import { AccountsService } from './accounts.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import {
  createAccountSchema,
  updateAccountSchema,
  paginationQuerySchema,
  CreateAccountInput,
  UpdateAccountInput,
  PaginationQuery,
} from '@marketlum/shared';
import { CreateAccountDto, UpdateAccountDto, AccountResponseDto } from './account.dto';

@ApiTags('accounts')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(AccountResponseDto)
@Controller('accounts')
@UseGuards(AdminGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an account' })
  @ApiBody({ type: CreateAccountDto })
  @ApiCreatedResponse({ type: AccountResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createAccountSchema)) body: CreateAccountInput,
  ) {
    return this.accountsService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'List and paginate accounts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'valueId', required: false, type: String })
  @ApiQuery({ name: 'agentId', required: false, type: String })
  @ApiPaginatedResponse(AccountResponseDto)
  async findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query('valueId') valueId?: string,
    @Query('agentId') agentId?: string,
  ) {
    return this.accountsService.findAll({ ...query, valueId, agentId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an account by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Account UUID' })
  @ApiOkResponse({ type: AccountResponseDto })
  @ApiNotFoundResponse({ description: 'Account not found' })
  async findOne(@Param('id') id: string) {
    return this.accountsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an account' })
  @ApiParam({ name: 'id', type: String, description: 'Account UUID' })
  @ApiBody({ type: UpdateAccountDto })
  @ApiOkResponse({ type: AccountResponseDto })
  @ApiNotFoundResponse({ description: 'Account not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAccountSchema)) body: UpdateAccountInput,
  ) {
    return this.accountsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an account' })
  @ApiParam({ name: 'id', type: String, description: 'Account UUID' })
  @ApiNoContentResponse({ description: 'Account deleted' })
  @ApiNotFoundResponse({ description: 'Account not found' })
  async remove(@Param('id') id: string) {
    await this.accountsService.remove(id);
  }
}
