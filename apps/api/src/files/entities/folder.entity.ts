import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Tree,
  TreeChildren,
  TreeParent,
  OneToMany,
} from "typeorm";
import { ApiProperty } from '@nestjs/swagger';
import { FileUpload } from './file-upload.entity';

@Entity()
@Tree("closure-table")
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'The unique identifier for the folder' })
  id: string;

  @Column({ length: 120 })
  @ApiProperty({ description: 'Folder name' })
  name: string;

  @TreeParent()
  @ApiProperty({ description: 'Parent folder', required: false })
  parent: Folder | null;

  @Column({ type: 'uuid', nullable: true })
  @ApiProperty({ description: 'Parent folder ID', required: false })
  parentId: string | null;

  @TreeChildren()
  @ApiProperty({ description: 'Child folders', type: () => [Folder] })
  children?: Folder[];

  @OneToMany(() => FileUpload, (file) => file.folder)
  @ApiProperty({ description: 'Files in this folder' })
  files?: FileUpload[];

  @CreateDateColumn()
  @ApiProperty({ description: 'The date when the folder was created' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'The date when the folder was last updated' })
  updatedAt: Date;
}
