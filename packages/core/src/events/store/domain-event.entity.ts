import { Column, Entity, Generated, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { AuditActorKind } from '@marketlum/shared';

/**
 * Append-only event store (spec 027 §3). Generic by schema — keyed by
 * (aggregateType, aggregateId, version) so Exchanges, Orders, Invoices and the
 * Ledger can adopt it without a migration — but only Tensions writes to it today.
 *
 * Deliberately:
 * - no FKs — attribution is denormalised so rows survive user/API-key deletion,
 *   exactly as audit_logs does (spec 026 Q8);
 * - never updated or deleted — rows are facts;
 * - NOT a domain-event primary entity — appending must not emit
 *   marketlum.domain_event.created.
 */
@Entity('domain_events')
@Unique('UQ_domain_events_stream_version', ['aggregateType', 'aggregateId', 'version'])
@Index('IDX_domain_events_stream', ['aggregateType', 'aggregateId', 'version'])
export class DomainEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Global append order; bigint arrives from pg as a string. */
  @Generated('increment')
  @Column({ type: 'bigint' })
  sequence: string;

  @Column({ type: 'varchar', length: 64 })
  aggregateType: string;

  @Column({ type: 'uuid' })
  aggregateId: string;

  /** 1-based position within the stream; unique per aggregate. */
  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'varchar', length: 64 })
  type: string;

  /** Payload shape version — additive-only changes, no upcasters yet (Q22). */
  @Column({ type: 'int', default: 1 })
  schemaVersion: number;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  payload: Record<string, unknown>;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  occurredAt: Date;

  /** Groups every event produced by one request / unit of work. */
  @Column({ type: 'uuid', nullable: true })
  correlationId: string | null;

  /** The event that caused this one; NULL when a user command is the cause. */
  @Column({ type: 'uuid', nullable: true })
  causationId: string | null;

  @Column({ type: 'enum', enum: AuditActorKind })
  actorKind: AuditActorKind;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', nullable: true })
  userEmail: string | null;

  @Column({ type: 'varchar', nullable: true })
  userName: string | null;

  @Column({ type: 'uuid', nullable: true })
  apiKeyId: string | null;

  @Column({ type: 'varchar', nullable: true })
  apiKeyName: string | null;

  @Column({ type: 'varchar', nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string | null;
}
