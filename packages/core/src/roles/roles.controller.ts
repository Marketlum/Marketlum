import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createRoleSchema,
  updateRoleSchema,
  CreateRoleInput,
  UpdateRoleInput,
} from '@marketlum/shared';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto } from './role.dto';

// Gated by convention: roles:read for GET, roles:write for mutations.
@ApiTags('roles')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid credentials' })
@ApiForbiddenResponse({ description: 'Missing roles:read / roles:write permission' })
@Controller('roles')
@UseGuards(AdminGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List all roles with their grants' })
  @ApiOkResponse({ type: RoleResponseDto, isArray: true })
  async findAll() {
    return this.rolesService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a role' })
  @ApiBody({ type: CreateRoleDto })
  @ApiCreatedResponse({ type: RoleResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or unknown permission resource' })
  @ApiNotFoundResponse({ description: 'Parent role not found' })
  @ApiConflictResponse({ description: 'Role code already exists' })
  async create(@Body(new ZodValidationPipe(createRoleSchema)) body: CreateRoleInput) {
    return this.rolesService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a role (permissions use full-replace semantics)' })
  @ApiParam({ name: 'id', type: String, description: 'Role UUID' })
  @ApiBody({ type: UpdateRoleDto })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiNotFoundResponse({ description: 'Role or parent not found' })
  @ApiConflictResponse({ description: 'Cycle in hierarchy or system role grants change' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRoleSchema)) body: UpdateRoleInput,
  ) {
    return this.rolesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a role' })
  @ApiParam({ name: 'id', type: String, description: 'Role UUID' })
  @ApiNoContentResponse({ description: 'Role deleted' })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiConflictResponse({ description: 'Role is a system role, has children, or is assigned' })
  async remove(@Param('id') id: string) {
    await this.rolesService.remove(id);
  }
}
