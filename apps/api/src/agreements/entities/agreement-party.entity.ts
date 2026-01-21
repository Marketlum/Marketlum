import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ApiProperty } from '@nestjs/swagger';
import { Agreement } from './agreement.entity';
import { Agent } from '../../agents/entities/agent.entity';

export enum AgreementPartyRole {
  BUYER = "buyer",
  SELLER = "seller",
  SERVICE_PROVIDER = "service_provider",
  CLIENT = "client",
  PARTNER = "partner",
  EMPLOYEE = "employee",
  EMPLOYER = "employer",
  OTHER = "other",
}

@Entity()
export class AgreementParty {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'The unique identifier for the agreement party' })
  id: string;

  @ManyToOne(() => Agreement, (agreement) => agreement.parties, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agreementId' })
  @ApiProperty({ description: 'The agreement' })
  agreement: Agreement;

  @Column({ type: 'uuid' })
  @ApiProperty({ description: 'Agreement ID' })
  agreementId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  @ApiProperty({ description: 'The agent (party)' })
  agent: Agent;

  @Column({ type: 'uuid' })
  @ApiProperty({ description: 'Agent ID' })
  agentId: string;

  @Column({
    type: "enum",
    enum: AgreementPartyRole,
    nullable: true,
  })
  @ApiProperty({ description: 'The role of the party in the agreement', required: false })
  role?: AgreementPartyRole;

  @CreateDateColumn()
  @ApiProperty({ description: 'The date when the party was added' })
  createdAt: Date;
}
