import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Exchange } from './exchange.entity';
import { Agent } from '../../agents/entities/agent.entity';

@Entity('exchange_parties')
@Unique(['exchangeId', 'agentId'])
export class ExchangeParty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Exchange, (exchange) => exchange.parties, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exchangeId' })
  exchange: Exchange;

  @Column({ type: 'uuid' })
  exchangeId: string;

  @ManyToOne(() => Agent, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column({ type: 'uuid' })
  agentId: string;

  @Column({ type: 'varchar', nullable: true })
  role: string | null;
}
