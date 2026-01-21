import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Tree,
  TreeChildren,
  TreeParent,
} from "typeorm";
import { ApiProperty } from '@nestjs/swagger';
import { AgreementParty } from './agreement-party.entity';
import { FileUpload } from '../../files/entities/file-upload.entity';

export enum AgreementCategory {
  INTERNAL_MARKET = "internal_market",
  EXTERNAL_MARKET = "external_market",
}

export enum AgreementGateway {
  PEN_AND_PAPER = "pen_and_paper",
  NOTARY = "notary",
  DOCU_SIGN = "docu_sign",
  OTHER = "other",
}

@Entity()
@Tree("closure-table")
export class Agreement {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'The unique identifier for the agreement' })
  id: string;

  @Column({ length: 200 })
  @ApiProperty({ description: 'The title of the agreement' })
  title: string;

  @Column({
    type: "enum",
    enum: AgreementCategory,
  })
  @ApiProperty({ description: 'The category of the agreement' })
  category: AgreementCategory;

  @Column({
    type: "enum",
    enum: AgreementGateway,
  })
  @ApiProperty({ description: 'The gateway used for the agreement' })
  gateway: AgreementGateway;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  @ApiProperty({ description: 'Optional URL link for the agreement', required: false })
  link?: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ description: 'Optional content/notes for the agreement', required: false })
  content?: string;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: 'Date when the agreement was completed', required: false })
  completedAt: Date | null;

  @TreeParent()
  @ApiProperty({ description: 'Parent agreement (if this is an annex)', required: false })
  parent: Agreement | null;

  @Column({ type: 'uuid', nullable: true })
  @ApiProperty({ description: 'Parent agreement ID', required: false })
  parentId: string | null;

  @TreeChildren()
  @ApiProperty({ description: 'Child agreements (annexes)', type: () => [Agreement] })
  children?: Agreement[];

  @ManyToOne(() => FileUpload, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fileId' })
  @ApiProperty({ description: 'Attached file', required: false })
  file: FileUpload | null;

  @Column({ type: 'uuid', nullable: true })
  @ApiProperty({ description: 'Attached file ID', required: false })
  fileId: string | null;

  @OneToMany(() => AgreementParty, (party) => party.agreement, { cascade: true })
  @ApiProperty({ description: 'Parties involved in the agreement' })
  parties?: AgreementParty[];

  @CreateDateColumn()
  @ApiProperty({ description: 'The date when the agreement was created' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'The date when the agreement was last updated' })
  updatedAt: Date;
}
