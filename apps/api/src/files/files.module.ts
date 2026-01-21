import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { FileUpload } from './entities/file-upload.entity';
import { Folder } from './entities/folder.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FileUpload, Folder])],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
