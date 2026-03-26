import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import * as path from 'path';
import { Folder } from './entities/folder.entity';
import { File } from './entities/file.entity';
import { FoldersService } from './folders.service';
import { FilesService } from './files.service';
import { FoldersController } from './folders.controller';
import { FilesController } from './files.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Folder, File]),
    MulterModule.register({
      storage: undefined, // memory storage (default)
    }),
  ],
  controllers: [FoldersController, FilesController],
  providers: [
    FoldersService,
    FilesService,
    {
      provide: 'UPLOADS_DIR',
      useValue: path.resolve(process.cwd(), 'uploads'),
    },
  ],
})
export class FilesModule {}
