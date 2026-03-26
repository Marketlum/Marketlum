import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  ManyToOne,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { Taxonomy } from '../../taxonomies/entities/taxonomy.entity';
import { File } from '../../files/entities/file.entity';

@Entity('archetypes')
export class Archetype {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  purpose: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToMany(() => Taxonomy)
  @JoinTable({
    name: 'archetype_taxonomies',
    joinColumn: { name: 'archetypeId', referencedColumnName: 'id' },
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
