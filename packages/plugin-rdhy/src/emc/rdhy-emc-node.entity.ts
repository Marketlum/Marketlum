import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { ValueStream } from '@marketlum/core';
import { RdhyEmcAgreement } from './rdhy-emc-agreement.entity';
import type { RdhyEmcNodeTier } from '../shared/emc-schemas';

/**
 * One micro-node of an EMC, anchored to a core value stream. STRATEGIC nodes
 * participate through value sharing (profitSharePercent); TACTICAL nodes
 * participate without it. Exactly one node per canvas is the leading node,
 * and it must be strategic (enforced by the service on canvas replace).
 */
@Entity('plugin_rdhy_emc_nodes')
@Unique('UQ_plugin_rdhy_emc_node_value_stream', ['agreementId', 'valueStreamId'])
export class RdhyEmcNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  agreementId: string;

  @ManyToOne(() => RdhyEmcAgreement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agreementId' })
  agreement: RdhyEmcAgreement;

  @Column({ type: 'uuid' })
  valueStreamId: string;

  @ManyToOne(() => ValueStream, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'valueStreamId' })
  valueStream: ValueStream;

  @Column({ type: 'varchar', length: 16 })
  tier: RdhyEmcNodeTier;

  @Column({ type: 'boolean', default: false })
  isLeading: boolean;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  profitSharePercent: string | null;

  @Column({ type: 'int' })
  position: number;
}
