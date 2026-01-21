import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ApiProperty } from '@nestjs/swagger';
import { Account } from './account.entity';

@Entity('ledger_transaction')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'The unique identifier for the transaction' })
  id: string;

  @ManyToOne(() => Account, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fromAccountId' })
  @ApiProperty({ description: 'The source account' })
  fromAccount: Account;

  @Column({ type: 'uuid' })
  @ApiProperty({ description: 'The ID of the source account' })
  fromAccountId: string;

  @ManyToOne(() => Account, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'toAccountId' })
  @ApiProperty({ description: 'The destination account' })
  toAccount: Account;

  @Column({ type: 'uuid' })
  @ApiProperty({ description: 'The ID of the destination account' })
  toAccountId: string;

  @Column({ type: 'decimal', precision: 20, scale: 6 })
  @ApiProperty({ description: 'The transaction amount (can be positive or negative)' })
  amount: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @ApiProperty({ description: 'The timestamp of the transaction' })
  timestamp: Date;

  @Column({ type: 'boolean', default: false })
  @ApiProperty({ description: 'Whether the transaction is verified' })
  verified: boolean;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ description: 'Optional note for the transaction', required: false })
  note: string | null;

  @CreateDateColumn()
  @ApiProperty({ description: 'The date when the transaction was created' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'The date when the transaction was last updated' })
  updatedAt: Date;
}
