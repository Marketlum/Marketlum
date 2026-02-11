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
import { Agent } from '../../agents/entities/agent.entity';
import { File } from '../../files/entities/file.entity';

@Entity('value_instances')
export class ValueInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @ManyToOne(() => Agent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fromAgentId' })
  fromAgent: Agent | null;

  @Column({ type: 'uuid', nullable: true })
  fromAgentId: string | null;

  @ManyToOne(() => Agent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'toAgentId' })
  toAgent: Agent | null;

  @Column({ type: 'uuid', nullable: true })
  toAgentId: string | null;

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
