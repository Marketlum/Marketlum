import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Offering } from './offering.entity';
import { Value } from '../../values/entities/value.entity';

@Entity('offering_components')
export class OfferingComponent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Offering, (o) => o.components, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offeringId' })
  offering: Offering;

  @Column({ type: 'uuid' })
  offeringId: string;

  @ManyToOne(() => Value, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'valueId' })
  value: Value;

  @Column({ type: 'uuid' })
  valueId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: string;

  @Column({ type: 'text', nullable: true })
  pricingFormula: string | null;

  @Column({ type: 'text', nullable: true })
  pricingLink: string | null;
}
