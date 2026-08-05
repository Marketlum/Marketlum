import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Value } from '../../values/entities/value.entity';
import { Actor } from '../../actors/entities/actor.entity';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToOne(() => Value, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'valueId' })
  value: Value;

  @Column({ type: 'uuid' })
  valueId: string;

  @ManyToOne(() => Actor, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actorId' })
  actor: Actor;

  @Column({ type: 'uuid' })
  actorId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual property — populated by service, never stored
  balance?: string;
}
