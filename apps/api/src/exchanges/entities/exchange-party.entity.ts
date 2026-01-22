import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exchange } from './exchange.entity';
import { Agent } from '../../agents/entities/agent.entity';

@Entity('exchange_party')
@Unique(['exchangeId', 'agentId'])
export class ExchangeParty {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Exchange ID' })
  @Column({ type: 'uuid' })
  exchangeId: string;

  @ManyToOne(() => Exchange, (exchange) => exchange.parties, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exchangeId' })
  exchange: Exchange;

  @ApiProperty({ description: 'Agent ID' })
  @Column({ type: 'uuid' })
  agentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
