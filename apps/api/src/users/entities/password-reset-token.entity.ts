import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';

@Entity()
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'The unique identifier for the token' })
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  @ApiProperty({ description: 'The user this token belongs to' })
  user: User;

  @Column({ type: 'uuid' })
  @Index()
  @ApiProperty({ description: 'The user ID' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  tokenHash: string;

  @Column({ type: 'timestamp' })
  @ApiProperty({ description: 'When the token expires' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: 'When the token was used', required: false })
  usedAt: Date | null;

  @CreateDateColumn()
  @ApiProperty({ description: 'The date when the token was created' })
  createdAt: Date;
}
