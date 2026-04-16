import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agreement } from './entities/agreement.entity';
import { Agent } from '../agents/entities/agent.entity';
import { File } from '../files/entities/file.entity';
import { AgreementTemplate } from '../agreement-templates/entities/agreement-template.entity';
import { AgreementsService } from './agreements.service';
import { AgreementsController } from './agreements.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Agreement, Agent, File, AgreementTemplate])],
  controllers: [AgreementsController],
  providers: [AgreementsService],
  exports: [AgreementsService],
})
export class AgreementsModule {}
