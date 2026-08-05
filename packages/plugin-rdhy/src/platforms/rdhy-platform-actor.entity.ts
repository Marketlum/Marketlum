import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Actor } from '@marketlum/core';
import { RdhyPlatform } from './rdhy-platform.entity';

/**
 * Membership link between a core actor and an RDHY platform. The UNIQUE
 * actorId enforces one platform per actor; both FKs cascade at the database
 * level so core never needs to know about this table.
 */
@Entity('plugin_rdhy_platform_actors')
export class RdhyPlatformActor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  platformId: string;

  @ManyToOne(() => RdhyPlatform, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'platformId' })
  platform: RdhyPlatform;

  @Column({ type: 'uuid', unique: true })
  actorId: string;

  @ManyToOne(() => Actor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actorId' })
  actor: Actor;

  @CreateDateColumn()
  createdAt: Date;
}
