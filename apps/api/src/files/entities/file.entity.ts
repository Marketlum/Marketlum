import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Folder } from './folder.entity';

@Entity('files')
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  originalName: string;

  @Column()
  storedName: string;

  @Column({ type: 'varchar' })
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number;

  @ManyToOne(() => Folder, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'folderId' })
  folder: Folder | null;

  @Column({ type: 'uuid', nullable: true })
  folderId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
