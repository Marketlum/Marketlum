import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Value } from '../../value/entities/value.entity';
import { Agent } from '../../agents/entities/agent.entity';
import { FileUpload } from '../../files/entities/file-upload.entity';

export enum ValueInstanceDirection {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing',
  INTERNAL = 'internal',
  NEUTRAL = 'neutral',
}

export enum ValueInstanceVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

@Entity('value_instance')
export class ValueInstance {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Core fields
  @ApiProperty({ description: 'Value ID' })
  @Column({ type: 'uuid' })
  valueId: string;

  @ManyToOne(() => Value, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'valueId' })
  value: Value;

  @ApiProperty({ description: 'Instance name', maxLength: 200 })
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @ApiProperty({ description: 'Instance purpose', maxLength: 500, nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  purpose: string | null;

  @ApiProperty({ description: 'Version string' })
  @Column({ type: 'varchar', length: 50, default: '1.0' })
  version: string;

  // Direction & Parties
  @ApiProperty({ description: 'Direction of value flow', enum: ValueInstanceDirection })
  @Column({
    type: 'enum',
    enum: ValueInstanceDirection,
    default: ValueInstanceDirection.NEUTRAL,
  })
  direction: ValueInstanceDirection;

  @ApiProperty({ description: 'From Agent ID', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  fromAgentId: string | null;

  @ManyToOne(() => Agent, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'fromAgentId' })
  fromAgent: Agent | null;

  @ApiProperty({ description: 'To Agent ID', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  toAgentId: string | null;

  @ManyToOne(() => Agent, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'toAgentId' })
  toAgent: Agent | null;

  // Hierarchy
  @ApiProperty({ description: 'Parent instance ID', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => ValueInstance, (instance) => instance.children, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: ValueInstance | null;

  @OneToMany(() => ValueInstance, (instance) => instance.parent)
  children: ValueInstance[];

  // Optional metadata
  @ApiProperty({ description: 'External link URL', nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  link: string | null;

  @ApiProperty({ description: 'Image file ID', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  imageFileId: string | null;

  @ManyToOne(() => FileUpload, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'imageFileId' })
  imageFile: FileUpload | null;

  // Visibility
  @ApiProperty({ description: 'Visibility setting', enum: ValueInstanceVisibility })
  @Column({
    type: 'enum',
    enum: ValueInstanceVisibility,
    default: ValueInstanceVisibility.PRIVATE,
  })
  visibility: ValueInstanceVisibility;

  // Audit
  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
