import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Locale } from '../locales/entities/locale.entity';
import { Agreement } from '../agreements/entities/agreement.entity';
import { FileUpload } from '../files/entities/file-upload.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      PasswordResetToken,
      Agent,
      Locale,
      Agreement,
      FileUpload,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
