import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Value } from './value.entity';
import { File } from '../../files/entities/file.entity';

@Entity('value_images')
@Unique(['valueId', 'fileId'])
export class ValueImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Value, (value) => value.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'valueId' })
  value: Value;

  @Column({ type: 'uuid' })
  valueId: string;

  @ManyToOne(() => File, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file: File;

  @Column({ type: 'uuid' })
  fileId: string;

  @Column({ type: 'int', default: 0 })
  position: number;
}
