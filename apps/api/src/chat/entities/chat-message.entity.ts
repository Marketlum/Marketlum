import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Chat } from './chat.entity';

export enum ChatRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  TOOL = 'tool',
}

@Entity()
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'The unique identifier for the message' })
  id: string;

  @ManyToOne(() => Chat, (chat) => chat.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatId' })
  @ApiProperty({ description: 'The chat this message belongs to' })
  chat: Chat;

  @Column({ type: 'uuid' })
  @ApiProperty({ description: 'Chat ID' })
  chatId: string;

  @Column({
    type: 'enum',
    enum: ChatRole,
  })
  @ApiProperty({ description: 'The role of the message sender', enum: ChatRole })
  role: ChatRole;

  @Column({ type: 'text' })
  @ApiProperty({ description: 'The message content (markdown)' })
  content: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @ApiProperty({ description: 'Tool name if this is a tool message' })
  toolName: string | null;

  @Column({ type: 'jsonb', nullable: true })
  @ApiProperty({ description: 'Tool input parameters' })
  toolInput: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  @ApiProperty({ description: 'Tool output result' })
  toolOutput: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  @ApiProperty({ description: 'Token usage statistics' })
  tokenUsage: Record<string, number> | null;

  @Column({ type: 'int', nullable: true })
  @ApiProperty({ description: 'Response latency in milliseconds' })
  latencyMs: number | null;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ description: 'Error message if any' })
  error: string | null;

  @CreateDateColumn()
  @ApiProperty({ description: 'When the message was created' })
  createdAt: Date;
}
