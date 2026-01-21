import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { ApiProperty } from '@nestjs/swagger';
import { Agent } from '../../agents/entities/agent.entity';
import { Value } from '../../value/entities/value.entity';

@Entity()
export class Account {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'The unique identifier for the account' })
  id: string;

  @Column({ length: 160 })
  @ApiProperty({ description: 'The name of the account' })
  name: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ description: 'Optional description of the account', required: false })
  description: string | null;

  @ManyToOne(() => Agent, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ownerAgentId' })
  @ApiProperty({ description: 'The agent that owns this account' })
  ownerAgent: Agent;

  @Column({ type: 'uuid' })
  @ApiProperty({ description: 'The ID of the agent that owns this account' })
  ownerAgentId: string;

  @ManyToOne(() => Value, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'valueId' })
  @ApiProperty({ description: 'The value type tracked by this account' })
  value: Value;

  @Column({ type: 'uuid' })
  @ApiProperty({ description: 'The ID of the value tracked by this account' })
  valueId: string;

  @Column({ type: 'decimal', precision: 20, scale: 6, default: 0 })
  @ApiProperty({ description: 'Current balance of the account' })
  balance: string;

  @CreateDateColumn()
  @ApiProperty({ description: 'The date when the account was created' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'The date when the account was last updated' })
  updatedAt: Date;
}
