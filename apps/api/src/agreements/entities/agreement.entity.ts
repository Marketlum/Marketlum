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
import { Agent } from '../../agents/entities/agent.entity';

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

  @ManyToMany(() => Agent)
  @JoinTable({
    name: 'agreement_parties',
    joinColumn: { name: 'agreementId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'agentId', referencedColumnName: 'id' },
  })
  parties: Agent[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
