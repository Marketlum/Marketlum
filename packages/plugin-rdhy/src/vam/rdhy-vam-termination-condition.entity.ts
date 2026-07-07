import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { RdhyVamAgreement } from './rdhy-vam-agreement.entity';

/** An ordered free-text termination rule; termination cites one of these. */
@Entity('plugin_rdhy_vam_termination_conditions')
export class RdhyVamTerminationCondition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  agreementId: string;

  @ManyToOne(() => RdhyVamAgreement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agreementId' })
  agreement: RdhyVamAgreement;

  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'text' })
  text: string;
}
