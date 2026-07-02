import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ValueStream } from '@marketlum/core';
import { RdhyPlatform } from './rdhy-platform.entity';

/**
 * Membership link between a core value stream and an RDHY platform. The UNIQUE
 * valueStreamId enforces one platform per value stream; both FKs cascade at
 * the database level so core never needs to know about this table.
 */
@Entity('plugin_rdhy_platform_value_streams')
export class RdhyPlatformValueStream {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  platformId: string;

  @ManyToOne(() => RdhyPlatform, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'platformId' })
  platform: RdhyPlatform;

  @Column({ type: 'uuid', unique: true })
  valueStreamId: string;

  @ManyToOne(() => ValueStream, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'valueStreamId' })
  valueStream: ValueStream;

  @CreateDateColumn()
  createdAt: Date;
}
