import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exchange } from './exchange.entity';
import { Value } from '../../values/entities/value.entity';
import { ValueInstance } from '../../value-instances/entities/value-instance.entity';
import { Agent } from '../../agents/entities/agent.entity';

@Entity('exchange_flows')
export class ExchangeFlow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Exchange, (exchange) => exchange.flows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exchangeId' })
  exchange: Exchange;

  @Column({ type: 'uuid' })
  exchangeId: string;

  @ManyToOne(() => Value, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'valueId' })
  value: Value | null;

  @Column({ type: 'uuid', nullable: true })
  valueId: string | null;

  @ManyToOne(() => ValueInstance, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'valueInstanceId' })
  valueInstance: ValueInstance | null;

  @Column({ type: 'uuid', nullable: true })
  valueInstanceId: string | null;

  @ManyToOne(() => Agent, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fromAgentId' })
  fromAgent: Agent;

  @Column({ type: 'uuid' })
  fromAgentId: string;

  @ManyToOne(() => Agent, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'toAgentId' })
  toAgent: Agent;

  @Column({ type: 'uuid' })
  toAgentId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
