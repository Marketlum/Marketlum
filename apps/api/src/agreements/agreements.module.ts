import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgreementsService } from './agreements.service';
import { AgreementsController } from './agreements.controller';
import { Agreement } from './entities/agreement.entity';
import { AgreementParty } from './entities/agreement-party.entity';
import { Agent } from '../agents/entities/agent.entity';
import { FileUpload } from '../files/entities/file-upload.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Agreement, AgreementParty, Agent, FileUpload])],
  controllers: [AgreementsController],
  providers: [AgreementsService],
})
export class AgreementsModule {}
