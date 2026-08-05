import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Exchange } from './exchange.entity';
import { Actor } from '../../actors/entities/actor.entity';

@Entity('exchange_parties')
@Unique(['exchangeId', 'actorId'])
export class ExchangeParty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Exchange, (exchange) => exchange.parties, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exchangeId' })
  exchange: Exchange;

  @Column({ type: 'uuid' })
  exchangeId: string;

  @ManyToOne(() => Actor, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actorId' })
  actor: Actor;

  @Column({ type: 'uuid' })
  actorId: string;

  @Column({ type: 'varchar', nullable: true })
  role: string | null;
}
