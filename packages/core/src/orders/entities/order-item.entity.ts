import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Value } from '../../values/entities/value.entity';
import { ValueInstance } from '../../value-instances/entities/value-instance.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'uuid' })
  orderId: string;

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

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  quantity: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  unitPrice: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  total: string;

  @Column({ type: 'int' })
  position: number;
}
