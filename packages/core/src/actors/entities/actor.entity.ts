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
import { ActorType } from '@marketlum/shared';
import { Taxonomy } from '../../taxonomies/entities/taxonomy.entity';
import { File } from '../../files/entities/file.entity';
import { Address } from '../addresses/entities/address.entity';
import { Value } from '../../values/entities/value.entity';

@Entity('actors')
@Tree('closure-table')
export class Actor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ActorType })
  type: ActorType;

  @TreeParent()
  @JoinColumn({ name: 'parentId' })
  parent: Actor | null;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @TreeChildren()
  children: Actor[];

  // Unlike the other trees, level is maintained by ActorsService (TypeORM
  // does not populate it — DB DEFAULT 0 is the insert-time backstop).
  @TreeLevelColumn()
  level: number;

  /** Not a column: populated by ActorsService.findOne (root → direct parent). */
  ancestors?: Actor[];

  @Column({ type: 'text', nullable: true })
  purpose: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  website: string | null;

  @ManyToOne(() => Taxonomy, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'mainTaxonomyId' })
  mainTaxonomy: Taxonomy | null;

  @Column({ type: 'uuid', nullable: true })
  mainTaxonomyId: string | null;

  @ManyToMany(() => Taxonomy)
  @JoinTable({
    name: 'actor_taxonomies',
    joinColumn: { name: 'actorId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'taxonomyId', referencedColumnName: 'id' },
  })
  taxonomies: Taxonomy[];

  @ManyToOne(() => File, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'imageId' })
  image: File | null;

  @Column({ type: 'uuid', nullable: true })
  imageId: string | null;

  @OneToMany(() => Address, (address) => address.actor)
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
