import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Value } from '../../values/entities/value.entity';
import { Actor } from '../../actors/entities/actor.entity';
import { File } from '../../files/entities/file.entity';

@Entity('value_instances')
export class ValueInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  purpose: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  link: string | null;

  @Column({ type: 'varchar', nullable: true })
  version: string | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @ManyToOne(() => Value, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'valueId' })
  value: Value;

  @Column({ type: 'uuid' })
  valueId: string;

  @ManyToOne(() => Actor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fromActorId' })
  fromActor: Actor | null;

  @Column({ type: 'uuid', nullable: true })
  fromActorId: string | null;

  @ManyToOne(() => Actor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'toActorId' })
  toActor: Actor | null;

  @Column({ type: 'uuid', nullable: true })
  toActorId: string | null;

  @ManyToOne(() => File, { nullable: true, onDelete: 'SET NULL', eager: true })
  @JoinColumn({ name: 'imageId' })
  image: File | null;

  @Column({ type: 'uuid', nullable: true })
  imageId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
