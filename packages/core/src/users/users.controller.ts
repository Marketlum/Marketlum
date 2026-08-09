import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
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
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import {
  createUserSchema,
  updateUserSchema,
  changeUserPasswordSchema,
  createApiKeySchema,
  usersListQuerySchema,
  assignUserRolesSchema,
  paginationQuerySchema,
  CreateUserInput,
  UpdateUserInput,
  ChangeUserPasswordInput,
  CreateApiKeyInput,
  UsersListQuery,
  AssignUserRolesInput,
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
  constructor(
    private readonly usersService: UsersService,
    private readonly apiKeysService: ApiKeysService,
  ) {}

  // Spec 025: agents cannot log in, so their API keys are provisioned by
  // admins here rather than through the self-service /api-keys routes.
  @Post(':id/api-keys')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create an API key for an agent user; plaintext returned only once" })
  @ApiParam({ name: 'id', type: String })
  @ApiBadRequestResponse({ description: 'Target user is not an agent' })
  async createAgentApiKey(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createApiKeySchema)) body: CreateApiKeyInput,
  ) {
    await this.assertAgentTarget(id);
    return this.apiKeysService.create(id, body);
  }

  @Get(':id/api-keys')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "List an agent user's API keys (metadata only)" })
  @ApiParam({ name: 'id', type: String })
  @ApiBadRequestResponse({ description: 'Target user is not an agent' })
  async listAgentApiKeys(@Param('id') id: string) {
    await this.assertAgentTarget(id);
    return this.apiKeysService.findAllForUser(id);
  }

  @Delete(':id/api-keys/:keyId')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Revoke an agent user's API key" })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'keyId', type: String })
  @ApiNoContentResponse({ description: 'API key revoked' })
  async revokeAgentApiKey(@Param('id') id: string, @Param('keyId') keyId: string) {
    await this.assertAgentTarget(id);
    await this.apiKeysService.remove(id, keyId);
  }

  private async assertAgentTarget(id: string): Promise<void> {
    const user = await this.usersService.findOne(id);
    if (user.type !== 'agent') {
      throw new BadRequestException('API keys can only be managed for agent users');
    }
  }

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
  @ApiQuery({ name: 'type', required: false, enum: ['human', 'agent'] })
  @ApiPaginatedResponse(UserResponseDto)
  async findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query(new ZodValidationPipe(usersListQuerySchema)) typeQuery: UsersListQuery,
  ) {
    return this.usersService.findAll({ ...query, ...typeQuery });
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

  @Put(':id/roles')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Replace a user's roles (idempotent full set)" })
  @ApiParam({ name: 'id', type: String, description: 'User UUID' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User or role not found' })
  @ApiConflictResponse({ description: 'Would remove the last wildcard-holding user' })
  async assignRoles(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(assignUserRolesSchema)) body: AssignUserRolesInput,
  ) {
    return this.usersService.assignRoles(id, body.roleIds);
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
