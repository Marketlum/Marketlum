import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgreementTemplate } from './entities/agreement-template.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';
import { Agent } from '../agents/entities/agent.entity';
import { AgreementTemplatesService } from './agreement-templates.service';
import { AgreementTemplatesController } from './agreement-templates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AgreementTemplate, ValueStream, Agent])],
  controllers: [AgreementTemplatesController],
  providers: [AgreementTemplatesService],
  exports: [AgreementTemplatesService],
})
export class AgreementTemplatesModule {}
