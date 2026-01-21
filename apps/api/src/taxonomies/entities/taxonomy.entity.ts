import {
  Entity,
  Tree,
  Column,
  PrimaryGeneratedColumn,
  TreeChildren,
  TreeParent,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { FileUpload } from "../../files/entities/file-upload.entity";

@Entity()
@Tree("closure-table")
export class Taxonomy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  link: string;

  @ManyToOne(() => FileUpload, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'imageId' })
  image: FileUpload | null;

  @Column({ type: 'uuid', nullable: true })
  imageId: string | null;

  @TreeChildren()
  children: Taxonomy[];

  @TreeParent({ onDelete: 'CASCADE' })
  parent: Taxonomy;
}
