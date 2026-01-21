import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { ApiProperty } from '@nestjs/swagger';
import { Agent } from '../../agents/entities/agent.entity';
import { Locale } from '../../locales/entities/locale.entity';
import { Agreement } from '../../agreements/entities/agreement.entity';
import { FileUpload } from '../../files/entities/file-upload.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'The unique identifier for the user' })
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  @ApiProperty({ description: 'The email address of the user' })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'boolean', default: true })
  @ApiProperty({ description: 'Whether the user is active' })
  isActive: boolean;

  @ManyToOne(() => FileUpload, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'avatarFileId' })
  @ApiProperty({ description: 'Avatar file', required: false })
  avatarFile: FileUpload | null;

  @Column({ type: 'uuid', nullable: true })
  @ApiProperty({ description: 'Avatar file ID', required: false })
  avatarFileId: string | null;

  @ManyToOne(() => Agent, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'agentId' })
  @ApiProperty({ description: 'The agent associated with this user' })
  agent: Agent;

  @Column({ type: 'uuid' })
  @Index({ unique: true })
  @ApiProperty({ description: 'The agent ID associated with this user' })
  agentId: string;

  @ManyToOne(() => Agreement, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'relationshipAgreementId' })
  @ApiProperty({ description: 'Relationship agreement', required: false })
  relationshipAgreement: Agreement | null;

  @Column({ type: 'uuid', nullable: true })
  @ApiProperty({ description: 'Relationship agreement ID', required: false })
  relationshipAgreementId: string | null;

  @Column({ type: 'date', nullable: true })
  @ApiProperty({ description: 'User birthday', required: false })
  birthday: Date | null;

  @Column({ type: 'date', nullable: true })
  @ApiProperty({ description: 'Date when user joined', required: false })
  joinedAt: Date | null;

  @Column({ type: 'date', nullable: true })
  @ApiProperty({ description: 'Date when user left', required: false })
  leftAt: Date | null;

  @ManyToOne(() => Locale, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'defaultLocaleId' })
  @ApiProperty({ description: 'Default locale for the user' })
  defaultLocale: Locale;

  @Column({ type: 'uuid' })
  @ApiProperty({ description: 'Default locale ID' })
  defaultLocaleId: string;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: 'Last login timestamp', required: false })
  lastLoginAt: Date | null;

  @CreateDateColumn()
  @ApiProperty({ description: 'The date when the user was created' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'The date when the user was last updated' })
  updatedAt: Date;
}
