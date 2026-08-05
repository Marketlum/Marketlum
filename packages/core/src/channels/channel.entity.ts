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
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Actor } from '../actors/entities/actor.entity';

@Entity('channels')
@Tree('closure-table')
export class Channel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  purpose: string | null;

  @Column({ type: 'varchar' })
  color: string;

  @TreeLevelColumn()
  level: number;

  @TreeParent()
  parent: Channel | null;

  @TreeChildren()
  children: Channel[];

  @ManyToOne(() => Actor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actorId' })
  actor: Actor | null;

  @Column({ type: 'uuid', nullable: true })
  actorId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
