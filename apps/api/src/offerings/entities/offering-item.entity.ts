import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { ApiProperty } from '@nestjs/swagger';
import { Offering } from './offering.entity';
import { Value } from '../../value/entities/value.entity';

@Entity()
@Unique(['offeringId', 'valueId'])
export class OfferingItem {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'The unique identifier for the offering item' })
  id: string;

  @ManyToOne(() => Offering, (offering) => offering.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offeringId' })
  @ApiProperty({ description: 'The offering this item belongs to' })
  offering: Offering;

  @Column({ type: 'uuid' })
  @ApiProperty({ description: 'Offering ID' })
  offeringId: string;

  @ManyToOne(() => Value, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'valueId' })
  @ApiProperty({ description: 'The value referenced by this item' })
  value: Value;

  @Column({ type: 'uuid' })
  @ApiProperty({ description: 'Value ID' })
  valueId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  @ApiProperty({ description: 'Quantity of the value in this offering' })
  quantity: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @ApiProperty({ description: 'Pricing formula or description', required: false })
  pricingFormula: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  @ApiProperty({ description: 'Link to pricing details', required: false })
  pricingLink: string | null;

  @CreateDateColumn()
  @ApiProperty({ description: 'The date when the item was created' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'The date when the item was last updated' })
  updatedAt: Date;
}
