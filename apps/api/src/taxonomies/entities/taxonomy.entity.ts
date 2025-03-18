import {
  Entity,
  Tree,
  Column,
  PrimaryGeneratedColumn,
  TreeChildren,
  TreeParent,
} from "typeorm"

@Entity()
@Tree("closure-table")
export class Taxonomy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ nullable: true })
  link: string;

  @TreeChildren()
  children: Taxonomy[];

  @TreeParent()
  parent: Taxonomy;
}
