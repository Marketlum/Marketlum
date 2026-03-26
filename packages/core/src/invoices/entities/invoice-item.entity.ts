import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';
import { Value } from '../../values/entities/value.entity';
import { ValueInstance } from '../../value-instances/entities/value-instance.entity';

@Entity('invoice_items')
export class InvoiceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column({ type: 'uuid' })
  invoiceId: string;

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

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitPrice: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: string;
}
