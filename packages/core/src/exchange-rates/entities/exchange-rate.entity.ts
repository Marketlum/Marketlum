import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Value } from '../../values/entities/value.entity';

@Entity('exchange_rates')
@Unique('UQ_exchange_rates_pair_at', ['fromValueId', 'toValueId', 'effectiveAt'])
@Index('IDX_exchange_rates_lookup', ['fromValueId', 'toValueId', 'effectiveAt'])
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Value, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fromValueId' })
  fromValue: Value;

  @Column({ type: 'uuid' })
  fromValueId: string;

  @ManyToOne(() => Value, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'toValueId' })
  toValue: Value;

  @Column({ type: 'uuid' })
  toValueId: string;

  @Column({ type: 'decimal', precision: 20, scale: 10 })
  rate: string;

  @Column({ type: 'timestamp' })
  effectiveAt: Date;

  @Column({ type: 'text', nullable: true })
  source: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
