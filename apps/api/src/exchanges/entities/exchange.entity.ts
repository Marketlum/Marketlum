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
import { ApiProperty } from '@nestjs/swagger';
import { ValueStream } from '../../value_streams/entities/value_stream.entity';
import { Channel } from '../../channels/entities/channel.entity';
import { Taxonomy } from '../../taxonomies/entities/taxonomy.entity';
import { Agreement } from '../../agreements/entities/agreement.entity';
import { User } from '../../users/entities/user.entity';
import { ExchangeParty } from './exchange-party.entity';
import { ExchangeFlow } from './exchange-flow.entity';

export enum ExchangeState {
  OPEN = 'open',
  COMPLETED = 'completed',
  CLOSED = 'closed',
}

@Entity('exchange')
export class Exchange {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Exchange name', maxLength: 200 })
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @ApiProperty({ description: 'Exchange purpose', maxLength: 500, nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  purpose: string | null;

  @ApiProperty({ description: 'Exchange state', enum: ExchangeState })
  @Column({
    type: 'enum',
    enum: ExchangeState,
    default: ExchangeState.OPEN,
  })
  state: ExchangeState;

  @ApiProperty({ description: 'When exchange was completed', nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @ApiProperty({ description: 'When exchange was closed', nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  // References
  @ApiProperty({ description: 'Value Stream ID' })
  @Column({ type: 'uuid' })
  valueStreamId: string;

  @ManyToOne(() => ValueStream, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'valueStreamId' })
  valueStream: ValueStream;

  @ApiProperty({ description: 'Channel ID', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  channelId: string | null;

  @ManyToOne(() => Channel, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'channelId' })
  channel: Channel | null;

  @ApiProperty({ description: 'Taxon ID', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  taxonId: string | null;

  @ManyToOne(() => Taxonomy, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'taxonId' })
  taxon: Taxonomy | null;

  @ApiProperty({ description: 'Agreement ID', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  agreementId: string | null;

  @ManyToOne(() => Agreement, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'agreementId' })
  agreement: Agreement | null;

  @ApiProperty({ description: 'Lead User ID', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  leadUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'leadUserId' })
  leadUser: User | null;

  // Relations
  @OneToMany(() => ExchangeParty, (party) => party.exchange, { cascade: true })
  parties: ExchangeParty[];

  @OneToMany(() => ExchangeFlow, (flow) => flow.exchange, { cascade: true })
  flows: ExchangeFlow[];

  // Audit
  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
