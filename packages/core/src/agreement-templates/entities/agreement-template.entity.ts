import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Tree,
  TreeChildren,
  TreeParent,
  TreeLevelColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AgreementTemplateType } from '@marketlum/shared';
import { ValueStream } from '../../value-streams/entities/value-stream.entity';

@Entity('agreement_templates')
@Tree('closure-table')
export class AgreementTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'enum', enum: AgreementTemplateType })
  type: AgreementTemplateType;

  @Column({ type: 'text', nullable: true })
  purpose: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  link: string | null;

  @TreeLevelColumn()
  level: number;

  @TreeParent()
  parent: AgreementTemplate | null;

  @TreeChildren()
  children: AgreementTemplate[];

  @ManyToOne(() => ValueStream, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'valueStreamId' })
  valueStream: ValueStream | null;

  @Column({ type: 'uuid', nullable: true })
  valueStreamId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
