import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { RdhyEmcAgreement } from './rdhy-emc-agreement.entity';

/** One exit rule of the EMC; termination must cite one when any exist. */
@Entity('plugin_rdhy_emc_termination_conditions')
export class RdhyEmcTerminationCondition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  agreementId: string;

  @ManyToOne(() => RdhyEmcAgreement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agreementId' })
  agreement: RdhyEmcAgreement;

  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'text' })
  text: string;
}
