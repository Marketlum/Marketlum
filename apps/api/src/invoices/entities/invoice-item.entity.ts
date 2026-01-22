import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Check,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Invoice } from './invoice.entity';
import { Value } from '../../value/entities/value.entity';
import { ValueInstance } from '../../value-instances/entities/value-instance.entity';

@Entity('invoice_item')
@Unique(['invoiceId', 'valueId'])
@Unique(['invoiceId', 'valueInstanceId'])
@Check(`("valueId" IS NOT NULL AND "valueInstanceId" IS NULL) OR ("valueId" IS NULL AND "valueInstanceId" IS NOT NULL)`)
export class InvoiceItem {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Invoice reference
  @ApiProperty({ description: 'Invoice ID' })
  @Column({ type: 'uuid' })
  invoiceId: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  // Value reference (XOR with valueInstanceId)
  @ApiProperty({ description: 'Value ID', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  valueId: string | null;

  @ManyToOne(() => Value, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'valueId' })
  value: Value | null;

  // ValueInstance reference (XOR with valueId)
  @ApiProperty({ description: 'Value Instance ID', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  valueInstanceId: string | null;

  @ManyToOne(() => ValueInstance, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'valueInstanceId' })
  valueInstance: ValueInstance | null;

  // Quantity
  @ApiProperty({ description: 'Quantity', minimum: 0 })
  @Column({ type: 'decimal', precision: 12, scale: 4 })
  quantity: number;

  // Optional description
  @ApiProperty({ description: 'Item description', maxLength: 500, nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  // Audit
  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
