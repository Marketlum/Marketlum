import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
} from "typeorm"

export enum AgentType {
    INDIVIDUAL = "individual",
    ORGANIZATION = "organization",
    VIRTUAL = "virtual",
}

@Entity()
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: "enum",
    enum: AgentType,
    default: AgentType.ORGANIZATION
  })
  type: AgentType = AgentType.ORGANIZATION;
}
