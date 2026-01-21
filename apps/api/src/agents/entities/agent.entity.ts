import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm"

import { ApiProperty } from '@nestjs/swagger';
import { Geography } from '../../geographies/entities/geography.entity';

export enum AgentType {
    INDIVIDUAL = "individual",
    ORGANIZATION = "organization",
    VIRTUAL = "virtual",
}

@Entity()
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'The unique identifier for the agent' })
  id: string;

  @Column()
  @ApiProperty({ description: 'The name of the agent' })
  name: string;

  @Column({
    type: "enum",
    enum: AgentType,
    default: AgentType.ORGANIZATION
  })
  @ApiProperty({ description: 'The type of the agent' })
  type: AgentType = AgentType.ORGANIZATION;

  @ManyToOne(() => Geography, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'geographyId' })
  @ApiProperty({ description: 'The geography associated with the agent', required: false })
  geography?: Geography;

  @Column({ type: 'uuid', nullable: true })
  @ApiProperty({ description: 'The ID of the geography associated with the agent', required: false })
  geographyId?: string;

  @CreateDateColumn()
  @ApiProperty({ description: 'The date when the agent was created' })
  createdAt: Date;
}
