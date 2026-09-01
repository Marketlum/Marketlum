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

/**
 * Read model for the event-sourced Tension aggregate (spec 027).
 *
 * Rows are written only by TensionProjector, replaying `domain_events`. Do not
 * save this entity directly — `pnpm tension:rebuild` would revert the change.
 */
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

  /**
   * Stream head this projection row reflects (spec 027 §4). Maintained by the
   * projector, never by application code writing the row directly.
   */
  @Column({ type: 'int', default: 0 })
  version: number;

  // RESTRICT since spec 027 Q7: the database must not delete tensions behind
  // the event store's back. ActorsService.remove() discards them first.
  @ManyToOne(() => Actor, { onDelete: 'RESTRICT' })
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
