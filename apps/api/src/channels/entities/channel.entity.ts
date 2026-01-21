import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Tree,
  TreeChildren,
  TreeParent,
} from "typeorm"

import { ApiProperty } from '@nestjs/swagger';

export enum ChannelType {
  WEBSITE = "website",
  WEB_APP = "web_app",
  MOBILE_APP = "mobile_app",
  MARKETPLACE = "marketplace",
  SOCIAL_MEDIA = "social_media",
  MESSAGING = "messaging",
  EMAIL = "email",
  PAID_ADS = "paid_ads",
  PARTNER = "partner",
  RETAIL_STORE = "retail_store",
  EVENT = "event",
  FIELD_SALES = "field_sales",
  PRINT = "print",
  B2B_OUTBOUND = "b2b_outbound",
  B2B_INBOUND = "b2b_inbound",
  OTHER = "other",
}

@Entity()
@Tree("closure-table")
export class Channel {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'The unique identifier for the channel' })
  id: string;

  @Column({ length: 120 })
  @ApiProperty({ description: 'The name of the channel' })
  name: string;

  @Column({ nullable: true, length: 500 })
  @ApiProperty({ description: 'The purpose of the channel' })
  purpose: string;

  @Column({
    type: "enum",
    enum: ChannelType,
  })
  @ApiProperty({ description: 'The type of the channel' })
  type: ChannelType;

  @TreeChildren()
  children: Channel[];

  @TreeParent()
  parent: Channel;

  @CreateDateColumn()
  @ApiProperty({ description: 'The date when the channel was created' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'The date when the channel was last updated' })
  updatedAt: Date;
}
