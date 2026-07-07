import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { RdhyVamMilestone } from './rdhy-vam-milestone.entity';
import type { RdhyVamTrack } from '../shared/vam-schemas';

/** A cell of the value co-creation grid: milestone x track. */
@Entity('plugin_rdhy_vam_items')
export class RdhyVamItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  milestoneId: string;

  @ManyToOne(() => RdhyVamMilestone, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'milestoneId' })
  milestone: RdhyVamMilestone;

  @Column({ type: 'varchar', length: 32 })
  track: RdhyVamTrack;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 14, scale: 4, nullable: true })
  amount: string | null;

  @Column({ type: 'int' })
  position: number;
}
