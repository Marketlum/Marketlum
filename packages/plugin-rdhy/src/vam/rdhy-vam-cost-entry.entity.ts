import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { RdhyVamAgreement } from './rdhy-vam-agreement.entity';
import type { RdhyVamCostCategory } from '../shared/vam-schemas';

/** An OPERATING COSTS row of the canvas. */
@Entity('plugin_rdhy_vam_cost_entries')
export class RdhyVamCostEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  agreementId: string;

  @ManyToOne(() => RdhyVamAgreement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agreementId' })
  agreement: RdhyVamAgreement;

  @Column({ type: 'varchar', length: 32 })
  category: RdhyVamCostCategory;

  @Column()
  label: string;

  @Column({ type: 'decimal', precision: 14, scale: 4 })
  amount: string;

  @Column({ type: 'int', nullable: true })
  headcount: number | null;

  @Column({ type: 'int' })
  position: number;
}
