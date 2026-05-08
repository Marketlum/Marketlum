import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiQuery,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { searchQuerySchema, SearchQuery } from '@marketlum/shared';

@ApiTags('search')
@ApiCookieAuth('access_token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid auth cookie' })
@Controller('search')
@UseGuards(AdminGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Cross-entity full-text search',
    description: 'Searches across agents, values, taxonomies, and other entities; returns a typed result list.',
  })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search query string' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results to return' })
  @ApiOkResponse({
    description: 'Mixed entity search results',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Entity type, e.g. agent, value, tension' },
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async search(
    @Query(new ZodValidationPipe(searchQuerySchema)) query: SearchQuery,
  ) {
    return this.searchService.search(query);
  }
}
