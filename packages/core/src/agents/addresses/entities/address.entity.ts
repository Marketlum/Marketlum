import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Agent } from '../../entities/agent.entity';
import { Geography } from '../../../geographies/geography.entity';

@Entity('addresses')
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Column({ type: 'uuid' })
  agentId: string;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
