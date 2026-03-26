import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { AgentType } from '@marketlum/shared';
import { Taxonomy } from '../../taxonomies/entities/taxonomy.entity';
import { File } from '../../files/entities/file.entity';

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: AgentType })
  type: AgentType;

  @Column({ type: 'text', nullable: true })
  purpose: string | null;

  @ManyToOne(() => Taxonomy, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'mainTaxonomyId' })
  mainTaxonomy: Taxonomy | null;

  @Column({ type: 'uuid', nullable: true })
  mainTaxonomyId: string | null;

  @ManyToMany(() => Taxonomy)
  @JoinTable({
    name: 'agent_taxonomies',
    joinColumn: { name: 'agentId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'taxonomyId', referencedColumnName: 'id' },
  })
  taxonomies: Taxonomy[];

  @ManyToOne(() => File, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'imageId' })
  image: File | null;

  @Column({ type: 'uuid', nullable: true })
  imageId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
