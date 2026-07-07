import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { RdhyVamAgreement } from './rdhy-vam-agreement.entity';

/** A canvas timing row (inflection point), expressed as months from start. */
@Entity('plugin_rdhy_vam_milestones')
@Unique('UQ_plugin_rdhy_vam_milestone_offset', ['agreementId', 'offsetMonths'])
export class RdhyVamMilestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  agreementId: string;

  @ManyToOne(() => RdhyVamAgreement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agreementId' })
  agreement: RdhyVamAgreement;

  @Column({ type: 'int' })
  offsetMonths: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label: string | null;

  @Column({ type: 'int' })
  position: number;
}
