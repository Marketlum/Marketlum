import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { RdhyEmcNode } from './rdhy-emc-node.entity';

/** Cost coverage for a micro-node: a money amount and/or an FTE headcount. */
@Entity('plugin_rdhy_emc_cost_entries')
export class RdhyEmcCostEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  nodeId: string;

  @ManyToOne(() => RdhyEmcNode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nodeId' })
  node: RdhyEmcNode;

  @Column()
  label: string;

  @Column({ type: 'numeric', precision: 14, scale: 4 })
  amount: string;

  @Column({ type: 'int', nullable: true })
  headcount: number | null;

  @Column({ type: 'int' })
  position: number;
}
