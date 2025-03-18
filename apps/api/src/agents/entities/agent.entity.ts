import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
} from "typeorm"

import { ApiProperty } from '@nestjs/swagger';

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
}
