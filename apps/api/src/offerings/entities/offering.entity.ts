import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from "typeorm";
import { ApiProperty } from '@nestjs/swagger';
import { Agent } from '../../agents/entities/agent.entity';
import { ValueStream } from '../../value_streams/entities/value_stream.entity';
import { FileUpload } from '../../files/entities/file-upload.entity';
import { OfferingItem } from './offering-item.entity';

export enum OfferingState {
  DRAFT = 'draft',
  LIVE = 'live',
  ARCHIVED = 'archived',
}

@Entity()
export class Offering {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'The unique identifier for the offering' })
  id: string;

  @Column({ length: 200 })
  @ApiProperty({ description: 'The name of the offering' })
  name: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ description: 'Description of the offering', required: false })
  description: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @ApiProperty({ description: 'Purpose of the offering', required: false })
  purpose: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  @ApiProperty({ description: 'External link for the offering', required: false })
  link: string | null;

  @Column({
    type: 'enum',
    enum: OfferingState,
    default: OfferingState.DRAFT,
  })
  @ApiProperty({ description: 'Current state of the offering', enum: OfferingState })
  state: OfferingState;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: 'Date when the offering becomes active', required: false })
  activeFrom: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: 'Date when the offering expires', required: false })
  activeUntil: Date | null;

  @ManyToOne(() => Agent, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  @ApiProperty({ description: 'The agent who owns this offering' })
  agent: Agent;

  @Column({ type: 'uuid' })
  @ApiProperty({ description: 'Agent ID' })
  agentId: string;

  @ManyToOne(() => ValueStream, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'valueStreamId' })
  @ApiProperty({ description: 'The value stream this offering belongs to' })
  valueStream: ValueStream;

  @Column({ type: 'uuid' })
  @ApiProperty({ description: 'Value Stream ID' })
  valueStreamId: string;

  @OneToMany(() => OfferingItem, (item) => item.offering, { cascade: true })
  @ApiProperty({ description: 'Items included in this offering' })
  items: OfferingItem[];

  @ManyToMany(() => FileUpload)
  @JoinTable({
    name: 'offering_files',
    joinColumn: { name: 'offeringId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'fileId', referencedColumnName: 'id' },
  })
  @ApiProperty({ description: 'Files attached to this offering' })
  files: FileUpload[];

  @CreateDateColumn()
  @ApiProperty({ description: 'The date when the offering was created' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'The date when the offering was last updated' })
  updatedAt: Date;
}
