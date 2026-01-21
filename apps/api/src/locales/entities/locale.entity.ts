import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from "typeorm";

import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Locale {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'The unique identifier for the locale' })
  id: string;

  @Column({ type: 'varchar', length: 16, unique: true })
  @Index()
  @ApiProperty({ description: 'The locale code (e.g., en-US, pl-PL)' })
  code: string;

  @CreateDateColumn()
  @ApiProperty({ description: 'The date when the locale was created' })
  createdAt: Date;
}
