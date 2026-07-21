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
  Tree,
  TreeParent,
  TreeChildren,
  TreeLevelColumn,
} from 'typeorm';
import { AgentType } from '@marketlum/shared';
import { Taxonomy } from '../../taxonomies/entities/taxonomy.entity';
import { File } from '../../files/entities/file.entity';
import { Address } from '../addresses/entities/address.entity';
import { Value } from '../../values/entities/value.entity';

@Entity('agents')
@Tree('closure-table')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: AgentType })
  type: AgentType;

  @TreeParent()
  @JoinColumn({ name: 'parentId' })
  parent: Agent | null;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @TreeChildren()
  children: Agent[];

  // Unlike the other trees, level is maintained by AgentsService (TypeORM
  // does not populate it — DB DEFAULT 0 is the insert-time backstop).
  @TreeLevelColumn()
  level: number;

  /** Not a column: populated by AgentsService.findOne (root → direct parent). */
  ancestors?: Agent[];

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

  @OneToMany(() => Address, (address) => address.agent)
  addresses: Address[];

  @ManyToOne(() => Value, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'functionalCurrencyId' })
  functionalCurrency: Value | null;

  @Column({ type: 'uuid', nullable: true })
  functionalCurrencyId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
