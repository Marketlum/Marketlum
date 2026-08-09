import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { UserType } from '@marketlum/shared';
import { File } from '../../files/entities/file.entity';
import { Role } from '../../roles/entities/role.entity';
import { Actor } from '../../actors/entities/actor.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  /** NULL for agent users (spec 025) — agents authenticate via API keys only. */
  @Column({ type: 'varchar', nullable: true })
  password: string | null;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: UserType, default: UserType.HUMAN })
  type: UserType;

  /** Optional market identity: the agent-type Actor this agent user operates as. */
  @ManyToOne(() => Actor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actorId' })
  actor: Actor | null;

  @Column({ type: 'uuid', nullable: true })
  actorId: string | null;

  @ManyToOne(() => File, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'avatarId' })
  avatar: File | null;

  @Column({ type: 'uuid', nullable: true })
  avatarId: string | null;

  @ManyToMany(() => Role)
  @JoinTable({
    name: 'users_roles',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  roles: Role[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
