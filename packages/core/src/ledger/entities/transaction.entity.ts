import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Account } from './account.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fromAccountId' })
  fromAccount: Account | null;

  @Column({ type: 'uuid', nullable: true })
  fromAccountId: string | null;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'toAccountId' })
  toAccount: Account | null;

  @Column({ type: 'uuid', nullable: true })
  toAccountId: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'timestamp', default: () => 'now()' })
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
