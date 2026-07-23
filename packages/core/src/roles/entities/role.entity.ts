import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  code: string;

  @ManyToOne(() => Role, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parentId' })
  parent: Role | null;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @Column({ type: 'boolean', default: false })
  isSystem: boolean;

  @OneToMany(() => RolePermission, (grant) => grant.role)
  grants: RolePermission[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('role_permissions')
@Unique(['roleId', 'permission'])
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Role, (role) => role.grants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @Column({ type: 'uuid' })
  roleId: string;

  @Column({ type: 'varchar', length: 100 })
  permission: string;
}
