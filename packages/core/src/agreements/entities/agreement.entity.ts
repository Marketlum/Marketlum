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
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { File } from '../../files/entities/file.entity';
import { Actor } from '../../actors/entities/actor.entity';
import { AgreementTemplate } from '../../agreement-templates/entities/agreement-template.entity';
import { ValueStream } from '../../value-streams/entities/value-stream.entity';

@Entity('agreements')
@Tree('closure-table')
export class Agreement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ type: 'text', nullable: true })
  link: string | null;

  @TreeLevelColumn()
  level: number;

  @TreeParent()
  parent: Agreement | null;

  @TreeChildren()
  children: Agreement[];

  @ManyToOne(() => File, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fileId' })
  file: File | null;

  @Column({ type: 'uuid', nullable: true })
  fileId: string | null;

  @ManyToOne(() => AgreementTemplate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agreementTemplateId' })
  agreementTemplate: AgreementTemplate | null;

  @Column({ type: 'uuid', nullable: true })
  agreementTemplateId: string | null;

  @ManyToOne(() => ValueStream, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'valueStreamId' })
  valueStream: ValueStream | null;

  @Column({ type: 'uuid', nullable: true })
  valueStreamId: string | null;

  @ManyToMany(() => Actor)
  @JoinTable({
    name: 'agreement_parties',
    joinColumn: { name: 'agreementId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'actorId', referencedColumnName: 'id' },
  })
  parties: Actor[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
