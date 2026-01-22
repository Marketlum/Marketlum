import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { ChatMessage } from './chat-message.entity';

export enum LlmProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
}

@Entity()
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'The unique identifier for the chat' })
  id: string;

  @Column({ length: 200, default: 'New chat' })
  @ApiProperty({ description: 'The title of the chat' })
  title: string;

  @Column({
    type: 'enum',
    enum: LlmProvider,
    default: LlmProvider.OPENAI,
  })
  @ApiProperty({ description: 'The LLM provider', enum: LlmProvider })
  provider: LlmProvider;

  @Column({ length: 100 })
  @ApiProperty({ description: 'The model identifier' })
  model: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  @ApiProperty({ description: 'User who created the chat' })
  createdBy: User | null;

  @Column({ type: 'uuid', nullable: true })
  @ApiProperty({ description: 'User ID who created the chat' })
  createdByUserId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: 'When the chat was archived' })
  archivedAt: Date | null;

  @OneToMany(() => ChatMessage, (message) => message.chat, { cascade: true })
  @ApiProperty({ description: 'Messages in this chat' })
  messages?: ChatMessage[];

  @CreateDateColumn()
  @ApiProperty({ description: 'When the chat was created' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'When the chat was last updated' })
  updatedAt: Date;
}
