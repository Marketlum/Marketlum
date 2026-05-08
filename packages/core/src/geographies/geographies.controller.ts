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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { GeographiesService } from './geographies.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createGeographySchema,
  updateGeographySchema,
  moveGeographySchema,
  CreateGeographyInput,
  UpdateGeographyInput,
  MoveGeographyInput,
} from '@marketlum/shared';
import {
  CreateGeographyDto,
  UpdateGeographyDto,
  MoveGeographyDto,
  GeographyResponseDto,
} from './geography.dto';

@ApiTags('geographies')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@Controller('geographies')
@UseGuards(AdminGuard)
export class GeographiesController {
  constructor(private readonly geographiesService: GeographiesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a geography' })
  @ApiBody({ type: CreateGeographyDto })
  @ApiCreatedResponse({ type: GeographyResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async create(
    @Body(new ZodValidationPipe(createGeographySchema))
    body: CreateGeographyInput,
  ) {
    return this.geographiesService.create(body);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Full geography tree' })
  async findTree() {
    return this.geographiesService.findTree();
  }

  @Get('roots')
  @ApiOperation({ summary: 'Top-level geographies' })
  @ApiOkResponse({ type: GeographyResponseDto, isArray: true })
  async findRoots() {
    return this.geographiesService.findRoots();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a geography by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Geography UUID' })
  @ApiOkResponse({ type: GeographyResponseDto })
  @ApiNotFoundResponse({ description: 'Geography not found' })
  async findOne(@Param('id') id: string) {
    return this.geographiesService.findOne(id);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Direct children of a geography' })
  @ApiParam({ name: 'id', type: String, description: 'Geography UUID' })
  @ApiOkResponse({ type: GeographyResponseDto, isArray: true })
  async findChildren(@Param('id') id: string) {
    return this.geographiesService.findChildren(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a geography' })
  @ApiParam({ name: 'id', type: String, description: 'Geography UUID' })
  @ApiBody({ type: UpdateGeographyDto })
  @ApiOkResponse({ type: GeographyResponseDto })
  @ApiNotFoundResponse({ description: 'Geography not found' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateGeographySchema))
    body: UpdateGeographyInput,
  ) {
    return this.geographiesService.update(id, body);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Move a geography under a different parent' })
  @ApiParam({ name: 'id', type: String, description: 'Geography UUID' })
  @ApiBody({ type: MoveGeographyDto })
  @ApiOkResponse({ type: GeographyResponseDto })
  @ApiNotFoundResponse({ description: 'Geography not found' })
  async move(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveGeographySchema))
    body: MoveGeographyInput,
  ) {
    return this.geographiesService.move(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a geography' })
  @ApiParam({ name: 'id', type: String, description: 'Geography UUID' })
  @ApiNoContentResponse({ description: 'Geography deleted' })
  @ApiNotFoundResponse({ description: 'Geography not found' })
  async remove(@Param('id') id: string) {
    await this.geographiesService.remove(id);
  }
}
