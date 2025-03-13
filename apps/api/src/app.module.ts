import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ValueModule } from './value/value.module';

@Module({
  imports: [ValueModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
