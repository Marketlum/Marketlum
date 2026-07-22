import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Agent } from '@marketlum/core';
import { RdhyPlatform } from './rdhy-platform.entity';

/**
 * Membership link between a core agent and an RDHY platform. The UNIQUE
 * agentId enforces one platform per agent; both FKs cascade at the database
 * level so core never needs to know about this table.
 */
@Entity('plugin_rdhy_platform_agents')
export class RdhyPlatformAgent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  platformId: string;

  @ManyToOne(() => RdhyPlatform, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'platformId' })
  platform: RdhyPlatform;

  @Column({ type: 'uuid', unique: true })
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @CreateDateColumn()
  createdAt: Date;
}
