import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Actor } from '../../entities/actor.entity';
import { Geography } from '../../../geographies/geography.entity';

@Entity('addresses')
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Actor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actorId' })
  actor: Actor;

  @Column({ type: 'uuid' })
  actorId: string;

  @ManyToOne(() => Geography, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'countryId' })
  country: Geography;

  @Column({ type: 'uuid' })
  countryId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  label: string | null;

  @Column({ type: 'varchar', length: 255 })
  line1: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  line2: string | null;

  @Column({ type: 'varchar', length: 255 })
  city: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  region: string | null;

  @Column({ type: 'varchar', length: 20 })
  postalCode: string;

  @Column({ type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
