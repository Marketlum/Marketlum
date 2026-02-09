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

@Entity('folders')
@Tree('closure-table')
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @TreeLevelColumn()
  level: number;

  @TreeParent()
  parent: Folder | null;

  @TreeChildren()
  children: Folder[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
