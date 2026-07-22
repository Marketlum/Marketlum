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
import { OrderState } from '@marketlum/shared';
import { Agent } from '../../agents/entities/agent.entity';
import { Value } from '../../values/entities/value.entity';
import { Channel } from '../../channels/channel.entity';
import { Pipeline } from '../../pipelines/entities/pipeline.entity';
import { Locale } from '../../locales/locale.entity';
import { OrderItem } from './order-item.entity';

export interface OrderAddress {
  countryCode: string;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  number: string;

  @Column({ type: 'enum', enum: OrderState, default: OrderState.DRAFT })
  state: OrderState;

  @ManyToOne(() => Agent, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fromAgentId' })
  fromAgent: Agent;

  @Column({ type: 'uuid' })
  fromAgentId: string;

  @ManyToOne(() => Agent, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'toAgentId' })
  toAgent: Agent;

  @Column({ type: 'uuid' })
  toAgentId: string;

  @ManyToOne(() => Value, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'currencyId' })
  currency: Value;

  @Column({ type: 'uuid' })
  currencyId: string;

  @ManyToOne(() => Channel, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'channelId' })
  channel: Channel | null;

  @Column({ type: 'uuid', nullable: true })
  channelId: string | null;

  @ManyToOne(() => Pipeline, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pipelineId' })
  pipeline: Pipeline | null;

  @Column({ type: 'uuid', nullable: true })
  pipelineId: string | null;

  @ManyToOne(() => Locale, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'localeId' })
  locale: Locale | null;

  @Column({ type: 'uuid', nullable: true })
  localeId: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  shippingCountryCode: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  shippingLine1: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  shippingLine2: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  shippingCity: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  shippingPostalCode: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  billingCountryCode: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  billingLine1: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  billingLine2: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  billingCity: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  billingPostalCode: string | null;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total: string;

  @Column({ type: 'timestamp', nullable: true })
  placedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  shippingAddress?: OrderAddress | null;

  billingAddress?: OrderAddress | null;

  invoicedTotal?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
