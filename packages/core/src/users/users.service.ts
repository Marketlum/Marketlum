import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { File } from '../files/entities/file.entity';
import { CreateUserInput, UpdateUserInput, PaginationQuery } from '@marketlum/shared';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const { avatarId, ...rest } = input;

    const existing = await this.usersRepository.findOne({
      where: { email: rest.email },
    });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(rest.password, 10);
    const user = this.usersRepository.create({
      ...rest,
      password: hashedPassword,
    });

    if (avatarId) {
      const file = await this.fileRepository.findOne({ where: { id: avatarId } });
      if (!file) {
        throw new NotFoundException('Avatar file not found');
      }
      user.avatarId = avatarId;
      user.avatar = file;
    }

    const saved = await this.usersRepository.save(user);
    return this.findOne(saved.id);
  }

  async findAll(query: PaginationQuery) {
    const { page, limit, search, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown>[] = [];
    if (search) {
      where.push({ name: ILike(`%${search}%`) });
      where.push({ email: ILike(`%${search}%`) });
    }

    const order: Record<string, 'ASC' | 'DESC'> = {};
    if (sortBy) {
      order[sortBy] = sortOrder || 'ASC';
    } else {
      order.createdAt = 'DESC';
    }

    const [data, total] = await this.usersRepository.findAndCount({
      where: where.length > 0 ? where : undefined,
      relations: ['avatar'],
      order,
      skip,
      take: limit,
    });

    return {
      data: data.map((u) => this.stripPassword(u)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['avatar'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    const user = await this.findOne(id);
    const { avatarId, ...rest } = input;

    if (rest.password) {
      rest.password = await bcrypt.hash(rest.password, 10);
    }

    Object.assign(user, rest);

    if (avatarId !== undefined) {
      if (avatarId === null) {
        user.avatar = null;
        user.avatarId = null;
      } else {
        const file = await this.fileRepository.findOne({ where: { id: avatarId } });
        if (!file) {
          throw new NotFoundException('Avatar file not found');
        }
        user.avatarId = avatarId;
        user.avatar = file;
      }
    }

    await this.usersRepository.save(user);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async validateCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;

    return user;
  }

  stripPassword(user: User): Omit<User, 'password'> {
    const { password: _, ...result } = user;
    return result;
  }
}
