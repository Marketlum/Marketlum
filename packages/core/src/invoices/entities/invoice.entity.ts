import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { InvoiceMarket } from '@marketlum/shared';
import { Actor } from '../../actors/entities/actor.entity';
import { Value } from '../../values/entities/value.entity';
import { Channel } from '../../channels/channel.entity';
import { File } from '../../files/entities/file.entity';
import { Order } from '../../orders/entities/order.entity';
import { InvoiceItem } from './invoice-item.entity';

@Entity('invoices')
@Unique(['fromActorId', 'number'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  number: string;

  @ManyToOne(() => Actor, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fromActorId' })
  fromActor: Actor;

  @Column({ type: 'uuid' })
  fromActorId: string;

  @ManyToOne(() => Actor, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'toActorId' })
  toActor: Actor;

  @Column({ type: 'uuid' })
  toActorId: string;

  @Column({ type: 'timestamp' })
  issuedAt: Date;

  @Column({ type: 'timestamp' })
  dueAt: Date;

  @ManyToOne(() => Value, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'currencyId' })
  currency: Value;

  @Column({ type: 'uuid' })
  currencyId: string;

  @Column({ type: 'enum', enum: InvoiceMarket, default: InvoiceMarket.EXTERNAL })
  market: InvoiceMarket;

  @ManyToOne(() => Actor, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'onBehalfOfActorId' })
  onBehalfOfActor: Actor | null;

  @Column({ type: 'uuid', nullable: true })
  onBehalfOfActorId: string | null;

  @ManyToOne(() => Invoice, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'mirrorInvoiceId' })
  mirrorInvoice: Invoice | null;

  @Column({ type: 'uuid', nullable: true })
  mirrorInvoiceId: string | null;

  /** Not a column: reverse join populated on read — set when this invoice IS a mirror. */
  sourceInvoice?: Invoice | null;

  @Column({ type: 'boolean', default: false })
  paid: boolean;

  @Column({ type: 'text', nullable: true })
  link: string | null;

  @ManyToOne(() => File, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fileId' })
  file: File | null;

  @Column({ type: 'uuid', nullable: true })
  fileId: string | null;

  @ManyToOne(() => Channel, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'channelId' })
  channel: Channel | null;

  @Column({ type: 'uuid', nullable: true })
  channelId: string | null;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'orderId' })
  order: Order | null;

  @Column({ type: 'uuid', nullable: true })
  orderId: string | null;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true })
  items: InvoiceItem[];

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: string;

  presentationTotal?: string | null;

  fromActorTotal?: string | null;

  toActorTotal?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
