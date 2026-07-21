import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Value } from '@marketlum/core';
import { RdhyPlatform } from '../platforms/rdhy-platform.entity';
import type { RdhyEmcStatus } from '../shared/emc-schemas';

/**
 * One EMC (Ecosystem Micro-community) canvas: a group of micro-nodes — each
 * anchored to a core value stream — collaborating on a shared scenario,
 * sponsored by an RDHY industry platform. The header carries the EMC setting
 * (scenario, goals, governance, collaborative investment). Plan-only in spec
 * 015; guarded lifecycle DRAFT -> ACTIVE -> COMPLETED | TERMINATED.
 */
@Entity('plugin_rdhy_emc_agreements')
export class RdhyEmcAgreement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'varchar', length: 16, default: 'DRAFT' })
  status: RdhyEmcStatus;

  @Column({ type: 'text', nullable: true })
  collaborativeScenario: string | null;

  @Column({ type: 'text', nullable: true })
  collaborativeGoals: string | null;

  @Column({ type: 'text', nullable: true })
  governanceModel: string | null;

  /** Share of profits reinvested into the EMC ("collaborative investment"). */
  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  reinvestmentPercent: string | null;

  @Column({ type: 'text', nullable: true })
  investmentNote: string | null;

  @Column({ type: 'uuid' })
  platformId: string;

  // RESTRICT: agreements are contracts — the plugin's platform-delete endpoint
  // returns 409 while any exist; the FK is the backstop.
  @ManyToOne(() => RdhyPlatform, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'platformId' })
  platform: RdhyPlatform;

  /** Optional mirror of a core legal agreement. */
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
