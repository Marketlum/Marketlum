import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';
import { AddPartyDto } from './dto/add-party.dto';
import { AgreementCategory, AgreementGateway } from './entities/agreement.entity';

@Controller('agreements')
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Post()
  create(@Body() createAgreementDto: CreateAgreementDto) {
    return this.agreementsService.create(createAgreementDto);
  }

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('q') q?: string,
    @Query('category') category?: AgreementCategory,
    @Query('status') status?: 'open' | 'completed',
    @Query('gateway') gateway?: AgreementGateway,
    @Query('agentId') agentId?: string,
    @Query('sort') sort?: string,
  ) {
    limit = limit > 100 ? 100 : limit;
    return this.agreementsService.findAll(
      { q, category, status, gateway, agentId, sort },
      { page, limit, route: 'http://localhost:3001/agreements' },
    );
  }

  @Get('tree')
  findTree() {
    return this.agreementsService.findTree();
  }

  @Get('stats')
  getStats(
    @Query('category') category?: AgreementCategory,
    @Query('agentId') agentId?: string,
  ) {
    return this.agreementsService.getStats({ category, agentId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agreementsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAgreementDto: UpdateAgreementDto) {
    return this.agreementsService.update(id, updateAgreementDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.agreementsService.remove(id);
  }

  @Post(':id/parties')
  addParty(@Param('id') id: string, @Body() addPartyDto: AddPartyDto) {
    return this.agreementsService.addParty(id, addPartyDto);
  }

  @Delete(':id/parties/:agentId')
  removeParty(@Param('id') id: string, @Param('agentId') agentId: string) {
    return this.agreementsService.removeParty(id, agentId);
  }

  @Post('seed')
  seed() {
    return this.agreementsService.seed();
  }
}
