import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { RdhyEmcNode } from './rdhy-emc-node.entity';

/** One agreed service level for a micro-node's contribution to the EMC. */
@Entity('plugin_rdhy_emc_leading_goals')
export class RdhyEmcLeadingGoal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  nodeId: string;

  @ManyToOne(() => RdhyEmcNode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nodeId' })
  node: RdhyEmcNode;

  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'text' })
  text: string;
}
