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
import { Actor } from '../../actors/entities/actor.entity';

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

  @ManyToOne(() => Actor, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fromActorId' })
  fromActor: Actor;

  @Column({ type: 'uuid' })
  fromActorId: string;

  @ManyToOne(() => Actor, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'toActorId' })
  toActor: Actor;

  @Column({ type: 'uuid' })
  toActorId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
