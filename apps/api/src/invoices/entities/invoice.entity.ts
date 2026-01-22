import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Agent } from '../../agents/entities/agent.entity';
import { FileUpload } from '../../files/entities/file-upload.entity';
import { InvoiceItem } from './invoice-item.entity';

@Entity('invoice')
@Unique(['fromAgentId', 'number'])
export class Invoice {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Parties
  @ApiProperty({ description: 'From Agent ID' })
  @Column({ type: 'uuid' })
  fromAgentId: string;

  @ManyToOne(() => Agent, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fromAgentId' })
  fromAgent: Agent;

  @ApiProperty({ description: 'To Agent ID' })
  @Column({ type: 'uuid' })
  toAgentId: string;

  @ManyToOne(() => Agent, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'toAgentId' })
  toAgent: Agent;

  // Core fields
  @ApiProperty({ description: 'Invoice number', maxLength: 100 })
  @Column({ type: 'varchar', length: 100 })
  number: string;

  @ApiProperty({ description: 'Issue date' })
  @Column({ type: 'date' })
  issuedAt: Date;

  @ApiProperty({ description: 'Due date' })
  @Column({ type: 'date' })
  dueAt: Date;

  // Optional fields
  @ApiProperty({ description: 'External link URL', nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  link: string | null;

  @ApiProperty({ description: 'Attached file ID', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  fileId: string | null;

  @ManyToOne(() => FileUpload, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'fileId' })
  file: FileUpload | null;

  @ApiProperty({ description: 'Note', maxLength: 2000, nullable: true })
  @Column({ type: 'varchar', length: 2000, nullable: true })
  note: string | null;

  // Items
  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true })
  items: InvoiceItem[];

  // Audit
  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
