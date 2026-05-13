import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import {
  RecurringFlowDirection,
  RecurringFlowFrequency,
  RecurringFlowStatus,
} from '@marketlum/shared';
import { ValueStream } from '../../value-streams/entities/value-stream.entity';
import { Agent } from '../../agents/entities/agent.entity';
import { Value } from '../../values/entities/value.entity';
import { Offering } from '../../offerings/entities/offering.entity';
import { Agreement } from '../../agreements/entities/agreement.entity';
import { Taxonomy } from '../../taxonomies/entities/taxonomy.entity';

@Entity('recurring_flows')
export class RecurringFlow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ValueStream, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'valueStreamId' })
  valueStream: ValueStream;

  @Column({ type: 'uuid' })
  valueStreamId: string;

  @ManyToOne(() => Agent, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'counterpartyAgentId' })
  counterpartyAgent: Agent;

  @Column({ type: 'uuid' })
  counterpartyAgentId: string;

  @ManyToOne(() => Value, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'valueId' })
  value: Value | null;

  @Column({ type: 'uuid', nullable: true })
  valueId: string | null;

  @ManyToOne(() => Offering, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'offeringId' })
  offering: Offering | null;

  @Column({ type: 'uuid', nullable: true })
  offeringId: string | null;

  @ManyToOne(() => Agreement, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agreementId' })
  agreement: Agreement | null;

  @Column({ type: 'uuid', nullable: true })
  agreementId: string | null;

  @Column({ type: 'enum', enum: RecurringFlowDirection })
  direction: RecurringFlowDirection;

  @Column({ type: 'decimal', precision: 14, scale: 4 })
  amount: string;

  @ManyToOne(() => Value, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'currencyId' })
  currency: Value | null;

  @Column({ type: 'uuid', nullable: true })
  currencyId: string | null;

  @Column({ type: 'enum', enum: RecurringFlowFrequency })
  frequency: RecurringFlowFrequency;

  @Column({ type: 'int', default: 1 })
  interval: number;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  @Column({ type: 'enum', enum: RecurringFlowStatus, default: RecurringFlowStatus.DRAFT })
  status: RecurringFlowStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: true })
  rateUsed: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  baseAmount: string | null;

  @ManyToMany(() => Taxonomy)
  @JoinTable({
    name: 'recurring_flow_taxonomies',
    joinColumn: { name: 'recurringFlowId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'taxonomyId', referencedColumnName: 'id' },
  })
  taxonomies: Taxonomy[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
