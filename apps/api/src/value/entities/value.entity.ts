import {
  Entity,
  Tree,
  Column,
  PrimaryGeneratedColumn,
  TreeChildren,
  TreeParent,
} from "typeorm"

export enum ValueParentType {
  ON_TOP_OF = "on_top_of",
  PART_OF = "part_of",
}

export enum ValueType {
  PRODUCT = "product",
  SERVICE = "service",
  RELATIONSHIP = "relationship",
  RIGHT = "right",
}

@Entity()
@Tree("closure-table")
export class Value {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @TreeChildren()
  children: Value[];

  @TreeParent()
  parent: Value;

  @Column({
    type: "enum",
    enum: ValueParentType,
    default: ValueParentType.ON_TOP_OF
  })
  parentType: ValueParentType = ValueParentType.ON_TOP_OF;

  @Column({
    type: "enum",
    enum: ValueType,
    default: ValueType.PRODUCT
  })
  type: ValueType = ValueType.PRODUCT;
}
