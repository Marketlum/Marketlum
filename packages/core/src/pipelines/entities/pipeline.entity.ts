import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ValueStream } from '../../value-streams/entities/value-stream.entity';

@Entity('pipelines')
export class Pipeline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  purpose: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column()
  color: string;

  @ManyToOne(() => ValueStream, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'valueStreamId' })
  valueStream: ValueStream | null;

  @Column({ type: 'uuid', nullable: true })
  valueStreamId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
