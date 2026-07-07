import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ValueStream, Value } from '@marketlum/core';
import { RdhyPlatform } from '../platforms/rdhy-platform.entity';
import type { RdhyVamStatus } from '../shared/vam-schemas';

/**
 * One VAM (Value Adjustment Mechanism) canvas: a value co-creation plan for a
 * value stream over a time horizon, sponsored by an RDHY platform. Plan-only
 * in spec 014; guarded lifecycle DRAFT -> ACTIVE -> COMPLETED | TERMINATED.
 */
@Entity('plugin_rdhy_vam_agreements')
export class RdhyVamAgreement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'int' })
  horizonMonths: number;

  @Column({ type: 'varchar', length: 16, default: 'DRAFT' })
  status: RdhyVamStatus;

  @Column({ type: 'uuid' })
  valueStreamId: string;

  @ManyToOne(() => ValueStream, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'valueStreamId' })
  valueStream: ValueStream;

  @Column({ type: 'uuid' })
  platformId: string;

  // RESTRICT: agreements are contracts — the plugin's platform-delete endpoint
  // returns 409 while any exist; the FK is the backstop.
  @ManyToOne(() => RdhyPlatform, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'platformId' })
  platform: RdhyPlatform;

  /** Optional mirror of a core legal agreement (spec 014 Q4). */
  @Column({ type: 'uuid', nullable: true })
  agreementId: string | null;

  /** Single agreement-level currency; child amounts are plain decimals in it. */
  @Column({ type: 'uuid', nullable: true })
  currencyId: string | null;

  @ManyToOne(() => Value, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'currencyId' })
  currency: Value | null;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  citedTerminationConditionId: string | null;

  @Column({ type: 'text', nullable: true })
  terminationNote: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
