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
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PerspectivesService } from './perspectives.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createPerspectiveSchema,
  updatePerspectiveSchema,
  CreatePerspectiveInput,
  UpdatePerspectiveInput,
  TableName,
} from '@marketlum/shared';
import { User } from '../users/entities/user.entity';
import {
  CreatePerspectiveDto,
  UpdatePerspectiveDto,
  PerspectiveResponseDto,
} from './perspective.dto';

@ApiTags('perspectives')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@Controller('perspectives')
@UseGuards(AdminGuard)
export class PerspectivesController {
  constructor(private readonly perspectivesService: PerspectivesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a perspective for the current user' })
  @ApiBody({ type: CreatePerspectiveDto })
  @ApiOkResponse({ type: PerspectiveResponseDto })
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(createPerspectiveSchema)) body: CreatePerspectiveInput,
  ) {
    return this.perspectivesService.create(user.id, body);
  }

  @Get()
  @ApiOperation({ summary: 'List perspectives for the current user, scoped to a table' })
  @ApiQuery({ name: 'table', required: true, enum: TableName })
  @ApiOkResponse({ type: PerspectiveResponseDto, isArray: true })
  async findAll(
    @CurrentUser() user: User,
    @Query('table') table: TableName,
  ) {
    return this.perspectivesService.findAll(user.id, table);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a perspective owned by the current user' })
  @ApiParam({ name: 'id', type: String, description: 'Perspective UUID' })
  @ApiBody({ type: UpdatePerspectiveDto })
  @ApiOkResponse({ type: PerspectiveResponseDto })
  @ApiNotFoundResponse({ description: 'Perspective not found' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePerspectiveSchema)) body: UpdatePerspectiveInput,
  ) {
    return this.perspectivesService.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a perspective owned by the current user' })
  @ApiParam({ name: 'id', type: String, description: 'Perspective UUID' })
  @ApiNoContentResponse({ description: 'Perspective deleted' })
  @ApiNotFoundResponse({ description: 'Perspective not found' })
  async remove(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    await this.perspectivesService.remove(user.id, id);
  }
}
