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
export class ValueStream {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  purpose: string;

  @TreeChildren()
  children: ValueStream[];

  @TreeParent()
  parent: ValueStream;
}
