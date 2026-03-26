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
import { ExchangeState } from '@marketlum/shared';
import { ValueStream } from '../../value-streams/entities/value-stream.entity';
import { Channel } from '../../channels/channel.entity';
import { Pipeline } from '../../pipelines/entities/pipeline.entity';
import { User } from '../../users/entities/user.entity';
import { ExchangeParty } from './exchange-party.entity';
import { ExchangeFlow } from './exchange-flow.entity';

@Entity('exchanges')
export class Exchange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  purpose: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToOne(() => ValueStream, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'valueStreamId' })
  valueStream: ValueStream | null;

  @Column({ type: 'uuid', nullable: true })
  valueStreamId: string | null;

  @ManyToOne(() => Channel, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'channelId' })
  channel: Channel | null;

  @Column({ type: 'uuid', nullable: true })
  channelId: string | null;

  @ManyToOne(() => Pipeline, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pipelineId' })
  pipeline: Pipeline | null;

  @Column({ type: 'uuid', nullable: true })
  pipelineId: string | null;

  @Column({ type: 'enum', enum: ExchangeState, default: ExchangeState.OPEN })
  state: ExchangeState;

  @Column({ type: 'timestamp' })
  openedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  link: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'leadUserId' })
  lead: User | null;

  @Column({ type: 'uuid', nullable: true })
  leadUserId: string | null;

  @OneToMany(() => ExchangeParty, (party) => party.exchange, { cascade: true })
  parties: ExchangeParty[];

  @OneToMany(() => ExchangeFlow, (flow) => flow.exchange, { cascade: true })
  flows: ExchangeFlow[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
