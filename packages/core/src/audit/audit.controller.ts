import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  auditLogsQuerySchema,
  paginationQuerySchema,
  AuditLogsQuery,
  PaginationQuery,
} from '@marketlum/shared';
import { AuditService } from './audit.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

// Read-only by design (spec 026 Q4): no POST/PATCH/DELETE routes exist.
@ApiTags('audit')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth' })
@RequirePermission('audit')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List and filter audit entries (audit:read)' })
  @ApiOkResponse({ description: 'Paginated audit entries' })
  async findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema)) pagination: PaginationQuery,
    @Query(new ZodValidationPipe(auditLogsQuerySchema)) filters: AuditLogsQuery,
  ) {
    return this.auditService.findAll({ ...pagination, ...filters });
  }

  // Declared before :id so "entity-types" is not captured as an id param.
  @Get('entity-types')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Distinct entity types present in the trail (audit:read)' })
  @ApiOkResponse({ type: [String] })
  async entityTypes() {
    return this.auditService.entityTypes();
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Fetch a single audit entry (audit:read)' })
  @ApiNotFoundResponse({ description: 'Audit entry not found' })
  async findOne(@Param('id') id: string) {
    const entry = await this.auditService.findOne(id);
    if (!entry) throw new NotFoundException('Audit entry not found');
    return entry;
  }
}
