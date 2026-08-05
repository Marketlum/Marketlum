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
import { Actor } from '../../actors/entities/actor.entity';
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

  @ManyToOne(() => Actor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actorId' })
  actor: Actor;

  @Column({ type: 'uuid' })
  actorId: string;

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
