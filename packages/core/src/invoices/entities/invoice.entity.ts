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
import { Agent } from '../../agents/entities/agent.entity';
import { Value } from '../../values/entities/value.entity';
import { Channel } from '../../channels/channel.entity';
import { File } from '../../files/entities/file.entity';
import { InvoiceItem } from './invoice-item.entity';

@Entity('invoices')
@Unique(['fromAgentId', 'number'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  number: string;

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

  @Column({ type: 'timestamp' })
  issuedAt: Date;

  @Column({ type: 'timestamp' })
  dueAt: Date;

  @ManyToOne(() => Value, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'currencyId' })
  currency: Value;

  @Column({ type: 'uuid' })
  currencyId: string;


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

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true })
  items: InvoiceItem[];

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: string;

  presentationTotal?: string | null;

  fromAgentTotal?: string | null;

  toAgentTotal?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
