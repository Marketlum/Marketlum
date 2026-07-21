import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { RdhyEmcNode } from './rdhy-emc-node.entity';

/** One service a micro-node commits to offer to the EMC. */
@Entity('plugin_rdhy_emc_exposed_services')
export class RdhyEmcExposedService {
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
