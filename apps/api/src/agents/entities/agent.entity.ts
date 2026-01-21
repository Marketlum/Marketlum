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

  @Column({ type: 'varchar', length: 255, nullable: true })
  @ApiProperty({ description: 'Street address of the agent', required: false })
  street?: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  @ApiProperty({ description: 'City where the agent is located', required: false })
  city?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  @ApiProperty({ description: 'Postal code of the agent location', required: false })
  postalCode?: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  @ApiProperty({ description: 'Country where the agent is located', required: false })
  country?: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  @ApiProperty({ description: 'Latitude coordinate for map display', required: false })
  latitude?: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  @ApiProperty({ description: 'Longitude coordinate for map display', required: false })
  longitude?: number;

  @CreateDateColumn()
  @ApiProperty({ description: 'The date when the agent was created' })
  createdAt: Date;
}
