import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Tree,
  TreeChildren,
  TreeParent,
  TreeLevelColumn,
} from 'typeorm';
import { GeographyType } from '@marketlum/shared';

@Entity('geographies')
@Tree('closure-table')
export class Geography {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', unique: true })
  code: string;

  @Column({ type: 'enum', enum: GeographyType })
  type: GeographyType;

  @TreeLevelColumn()
  level: number;

  @TreeParent()
  parent: Geography | null;

  @TreeChildren()
  children: Geography[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
