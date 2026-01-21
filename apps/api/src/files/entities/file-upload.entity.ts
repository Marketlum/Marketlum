import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ApiProperty } from '@nestjs/swagger';
import { Folder } from './folder.entity';

export enum StorageProvider {
  LOCAL = "local",
  S3 = "s3",
}

@Entity()
export class FileUpload {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'The unique identifier for the file' })
  id: string;

  @ManyToOne(() => Folder, (folder) => folder.files, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'folderId' })
  @ApiProperty({ description: 'Folder containing this file', required: false })
  folder: Folder | null;

  @Column({ type: 'uuid', nullable: true })
  @ApiProperty({ description: 'Folder ID', required: false })
  folderId: string | null;

  @Column({ length: 255 })
  @ApiProperty({ description: 'Original filename' })
  originalName: string;

  @Column({ length: 255 })
  @ApiProperty({ description: 'Internal storage filename' })
  fileName: string;

  @Column({ length: 127 })
  @ApiProperty({ description: 'MIME type of the file' })
  mimeType: string;

  @Column({ type: 'integer' })
  @ApiProperty({ description: 'File size in bytes' })
  sizeBytes: number;

  @Column({ type: 'integer', nullable: true })
  @ApiProperty({ description: 'Image width in pixels', required: false })
  width: number | null;

  @Column({ type: 'integer', nullable: true })
  @ApiProperty({ description: 'Image height in pixels', required: false })
  height: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  @ApiProperty({ description: 'File checksum for deduplication', required: false })
  checksum: string | null;

  @Column({
    type: "enum",
    enum: StorageProvider,
    default: StorageProvider.LOCAL,
  })
  @ApiProperty({ description: 'Storage provider' })
  storageProvider: StorageProvider;

  @Column({ length: 512 })
  @ApiProperty({ description: 'Storage key/path' })
  storageKey: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  @ApiProperty({ description: 'Thumbnail storage key', required: false })
  thumbnailKey: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @ApiProperty({ description: 'Alt text for images', required: false })
  altText: string | null;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ description: 'Caption for the file', required: false })
  caption: string | null;

  @Column({ type: 'boolean', default: false })
  @ApiProperty({ description: 'Whether the file is archived' })
  isArchived: boolean;

  @CreateDateColumn()
  @ApiProperty({ description: 'The date when the file was uploaded' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'The date when the file was last updated' })
  updatedAt: Date;
}
