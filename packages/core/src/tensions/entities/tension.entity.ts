import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { TensionState } from '@marketlum/shared';
import { Agent } from '../../agents/entities/agent.entity';
import { User } from '../../users/entities/user.entity';
import { Exchange } from '../../exchanges/entities/exchange.entity';

@Entity('tensions')
export class Tension {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  currentContext: string | null;

  @Column({ type: 'text', nullable: true })
  potentialFuture: string | null;

  @Column({ type: 'int', default: 5 })
  score: number;

  @Column({ type: 'enum', enum: TensionState, default: TensionState.ALIVE })
  state: TensionState;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column({ type: 'uuid' })
  agentId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'leadUserId' })
  lead: User | null;

  @Column({ type: 'uuid', nullable: true })
  leadUserId: string | null;

  @OneToMany(() => Exchange, (exchange) => exchange.tension)
  exchanges: Exchange[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
