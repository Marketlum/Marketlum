import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agreement } from './entities/agreement.entity';
import { Actor } from '../actors/entities/actor.entity';
import { File } from '../files/entities/file.entity';
import { AgreementTemplate } from '../agreement-templates/entities/agreement-template.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';
import { AgreementsService } from './agreements.service';
import { AgreementsController } from './agreements.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Agreement, Actor, File, AgreementTemplate, ValueStream])],
  controllers: [AgreementsController],
  providers: [AgreementsService],
  exports: [AgreementsService],
})
export class AgreementsModule {}
