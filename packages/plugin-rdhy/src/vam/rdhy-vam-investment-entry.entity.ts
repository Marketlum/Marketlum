import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { RdhyVamAgreement } from './rdhy-vam-agreement.entity';
import type { RdhyVamInvestmentKind } from '../shared/vam-schemas';

/** An INVESTMENTS row of the canvas (capital or a pre-allocated allowance). */
@Entity('plugin_rdhy_vam_investment_entries')
export class RdhyVamInvestmentEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  agreementId: string;

  @ManyToOne(() => RdhyVamAgreement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agreementId' })
  agreement: RdhyVamAgreement;

  @Column({ type: 'varchar', length: 32 })
  kind: RdhyVamInvestmentKind;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 4 })
  amount: string;

  @Column({ type: 'int' })
  position: number;
}
