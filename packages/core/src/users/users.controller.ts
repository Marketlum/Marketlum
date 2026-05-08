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
import { UsersService } from './users.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import {
  createUserSchema,
  updateUserSchema,
  changeUserPasswordSchema,
  paginationQuerySchema,
  CreateUserInput,
  UpdateUserInput,
  ChangeUserPasswordInput,
  PaginationQuery,
} from '@marketlum/shared';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangeUserPasswordDto,
  UserResponseDto,
} from './user.dto';

@ApiTags('users')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@ApiExtraModels(UserResponseDto)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a user' })
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput,
  ) {
    const user = await this.usersService.create(body);
    return this.usersService.stripPassword(user);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List and paginate users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiPaginatedResponse(UserResponseDto)
  async findAll(@Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', type: String, description: 'User UUID' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return this.usersService.stripPassword(user);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update a user (does not change password)' })
  @ApiParam({ name: 'id', type: String, description: 'User UUID' })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserInput,
  ) {
    const user = await this.usersService.update(id, body);
    return this.usersService.stripPassword(user);
  }

  @Post(':id/change-password')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change a user password' })
  @ApiParam({ name: 'id', type: String, description: 'User UUID' })
  @ApiBody({ type: ChangeUserPasswordDto })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  async changePassword(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(changeUserPasswordSchema)) body: ChangeUserPasswordInput,
  ) {
    const user = await this.usersService.changePassword(id, body.password);
    return this.usersService.stripPassword(user);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', type: String, description: 'User UUID' })
  @ApiNoContentResponse({ description: 'User deleted' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
  }
}
