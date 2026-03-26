import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { OfferingState } from '@marketlum/shared';
import { ValueStream } from '../../value-streams/entities/value-stream.entity';
import { Agent } from '../../agents/entities/agent.entity';
import { OfferingComponent } from './offering-component.entity';

@Entity('offerings')
export class Offering {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  purpose: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  link: string | null;

  @Column({ type: 'enum', enum: OfferingState, default: OfferingState.DRAFT })
  state: OfferingState;

  @Column({ type: 'timestamp', nullable: true })
  activeFrom: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  activeUntil: Date | null;

  @ManyToOne(() => ValueStream, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'valueStreamId' })
  valueStream: ValueStream | null;

  @Column({ type: 'uuid', nullable: true })
  valueStreamId: string | null;

  @ManyToOne(() => Agent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent | null;

  @Column({ type: 'uuid', nullable: true })
  agentId: string | null;

  @OneToMany(() => OfferingComponent, (c) => c.offering, { cascade: true })
  components: OfferingComponent[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
