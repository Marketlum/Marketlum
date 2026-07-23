import { createZodDto } from 'nestjs-zod';
import {
  createRoleSchema,
  updateRoleSchema,
  assignUserRolesSchema,
  roleResponseSchema,
} from '@marketlum/shared';

export class CreateRoleDto extends createZodDto(createRoleSchema as never) {}
export class UpdateRoleDto extends createZodDto(updateRoleSchema as never) {}
export class AssignUserRolesDto extends createZodDto(assignUserRolesSchema as never) {}
export class RoleResponseDto extends createZodDto(roleResponseSchema as never) {}
