import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from "typeorm";
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class FileUpload {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'The unique identifier for the file' })
  id: string;

  @Column({ length: 255 })
  @ApiProperty({ description: 'Original filename' })
  originalName: string;

  @Column({ length: 127 })
  @ApiProperty({ description: 'MIME type of the file' })
  mimeType: string;

  @Column({ type: 'integer' })
  @ApiProperty({ description: 'File size in bytes' })
  sizeBytes: number;

  @Column({ length: 512 })
  @ApiProperty({ description: 'Storage key/path' })
  storageKey: string;

  @CreateDateColumn()
  @ApiProperty({ description: 'The date when the file was uploaded' })
  uploadedAt: Date;
}
