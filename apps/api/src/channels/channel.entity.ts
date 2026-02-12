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
import { Agent } from '../agents/entities/agent.entity';

@Entity('channels')
@Tree('closure-table')
export class Channel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @ManyToOne(() => Agent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent | null;

  @Column({ type: 'uuid', nullable: true })
  agentId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
