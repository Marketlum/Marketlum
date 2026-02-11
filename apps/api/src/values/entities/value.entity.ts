import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { ValueType, ValueParentType } from '@marketlum/shared';
import { Taxonomy } from '../../taxonomies/entities/taxonomy.entity';
import { File } from '../../files/entities/file.entity';
import { Agent } from '../../agents/entities/agent.entity';
import { ValueStream } from '../../value-streams/entities/value-stream.entity';
import { ValueImage } from './value-image.entity';

@Entity('values')
export class Value {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ValueType })
  type: ValueType;

  @Column({ type: 'text', nullable: true })
  purpose: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  link: string | null;

  @Column({ type: 'enum', enum: ValueParentType, nullable: true })
  parentType: ValueParentType | null;

  @ManyToOne(() => Value, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent: Value | null;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Agent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent | null;

  @Column({ type: 'uuid', nullable: true })
  agentId: string | null;

  @ManyToOne(() => Taxonomy, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'mainTaxonomyId' })
  mainTaxonomy: Taxonomy | null;

  @Column({ type: 'uuid', nullable: true })
  mainTaxonomyId: string | null;

  @ManyToMany(() => Taxonomy)
  @JoinTable({
    name: 'value_taxonomies',
    joinColumn: { name: 'valueId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'taxonomyId', referencedColumnName: 'id' },
  })
  taxonomies: Taxonomy[];

  @ManyToMany(() => File)
  @JoinTable({
    name: 'value_files',
    joinColumn: { name: 'valueId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'fileId', referencedColumnName: 'id' },
  })
  files: File[];

  @ManyToOne(() => ValueStream, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'valueStreamId' })
  valueStream: ValueStream | null;

  @Column({ type: 'uuid', nullable: true })
  valueStreamId: string | null;

  @OneToMany(() => ValueImage, (vi) => vi.value, { cascade: true })
  images: ValueImage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
