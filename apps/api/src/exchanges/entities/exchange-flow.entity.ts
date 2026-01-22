import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exchange } from './exchange.entity';
import { Agent } from '../../agents/entities/agent.entity';
import { Value } from '../../value/entities/value.entity';

@Entity('exchange_flow')
export class ExchangeFlow {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Exchange ID' })
  @Column({ type: 'uuid' })
  exchangeId: string;

  @ManyToOne(() => Exchange, (exchange) => exchange.flows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exchangeId' })
  exchange: Exchange;

  @ApiProperty({ description: 'From Party Agent ID' })
  @Column({ type: 'uuid' })
  fromPartyAgentId: string;

  @ManyToOne(() => Agent, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fromPartyAgentId' })
  fromPartyAgent: Agent;

  @ApiProperty({ description: 'To Party Agent ID' })
  @Column({ type: 'uuid' })
  toPartyAgentId: string;

  @ManyToOne(() => Agent, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'toPartyAgentId' })
  toPartyAgent: Agent;

  @ApiProperty({ description: 'Value ID' })
  @Column({ type: 'uuid' })
  valueId: string;

  @ManyToOne(() => Value, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'valueId' })
  value: Value;

  @ApiProperty({ description: 'Quantity', nullable: true })
  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  quantity: number | null;

  @ApiProperty({ description: 'Note', nullable: true })
  @Column({ type: 'text', nullable: true })
  note: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
