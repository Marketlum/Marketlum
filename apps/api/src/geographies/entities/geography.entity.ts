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

export enum GeographyLevel {
  PLANET = "Planet",
  CONTINENT = "Continent",
  CONTINENTAL_SECTION = "Continental Section",
  COUNTRY = "Country",
  REGION = "Region",
  CITY = "City",
}

// Define valid parent-child relationships
export const VALID_PARENT_LEVELS: Record<GeographyLevel, GeographyLevel[]> = {
  [GeographyLevel.PLANET]: [], // Planet has no parent
  [GeographyLevel.CONTINENT]: [GeographyLevel.PLANET],
  [GeographyLevel.CONTINENTAL_SECTION]: [GeographyLevel.CONTINENT],
  [GeographyLevel.COUNTRY]: [GeographyLevel.CONTINENT, GeographyLevel.CONTINENTAL_SECTION],
  [GeographyLevel.REGION]: [GeographyLevel.COUNTRY],
  [GeographyLevel.CITY]: [GeographyLevel.COUNTRY, GeographyLevel.REGION],
};

@Entity()
@Tree("closure-table")
export class Geography {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'The unique identifier for the geography' })
  id: string;

  @Column({ length: 120 })
  @ApiProperty({ description: 'The name of the geography' })
  name: string;

  @Column({ length: 32 })
  @ApiProperty({ description: 'The code of the geography (uppercase)' })
  code: string;

  @Column({
    type: "enum",
    enum: GeographyLevel,
  })
  @ApiProperty({ description: 'The level of the geography' })
  level: GeographyLevel;

  @TreeChildren()
  children: Geography[];

  @TreeParent()
  parent: Geography;

  @CreateDateColumn()
  @ApiProperty({ description: 'The date when the geography was created' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'The date when the geography was last updated' })
  updatedAt: Date;
}
