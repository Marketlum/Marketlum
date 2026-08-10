import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { AuditCategory, AuditActorKind } from '@marketlum/shared';

/**
 * Append-only audit entry (spec 026). Deliberately:
 * - no FKs — entries must survive user/key deletion (actor data is denormalized);
 * - no @UpdateDateColumn — rows are never updated;
 * - NOT a domain-event primary entity — no marketlum.audit_log.* events.
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AuditCategory })
  category: AuditCategory;

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

  /** Snake name incl. plugin prefix (e.g. "actor", "plugin.rdhy.vam_agreement"); NULL for auth. */
  @Column({ type: 'varchar', nullable: true })
  entityType: string | null;

  @Column({ type: 'uuid', nullable: true })
  entityId: string | null;

  /** created|updated|deleted, a tool name, or login_success|login_failure|logout. */
  @Column({ type: 'varchar', nullable: true })
  action: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  context: Record<string, unknown>;

  @Column({ type: 'varchar', nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
