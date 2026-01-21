import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { Agent } from '../agents/entities/agent.entity';
import { Locale } from '../locales/entities/locale.entity';
import { Agreement } from '../agreements/entities/agreement.entity';
import { FileUpload } from '../files/entities/file-upload.entity';

export interface UserPaginatedResponse {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  isActive?: boolean;
  agentId?: string;
  localeId?: string;
  sort?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    @InjectRepository(Locale)
    private localeRepository: Repository<Locale>,
    @InjectRepository(Agreement)
    private agreementRepository: Repository<Agreement>,
    @InjectRepository(FileUpload)
    private fileUploadRepository: Repository<FileUpload>,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const normalizedEmail = createUserDto.email.toLowerCase().trim();

    // Check email uniqueness
    const existingByEmail = await this.userRepository.findOne({
      where: { email: ILike(normalizedEmail) },
    });
    if (existingByEmail) {
      throw new ConflictException('Email already exists.');
    }

    // Check agent uniqueness
    const existingByAgent = await this.userRepository.findOne({
      where: { agentId: createUserDto.agentId },
    });
    if (existingByAgent) {
      throw new ConflictException('Agent is already assigned to another user.');
    }

    // Validate agent exists
    const agent = await this.agentRepository.findOne({
      where: { id: createUserDto.agentId },
    });
    if (!agent) {
      throw new BadRequestException('Agent not found.');
    }

    // Validate locale exists
    const locale = await this.localeRepository.findOne({
      where: { id: createUserDto.defaultLocaleId },
    });
    if (!locale) {
      throw new BadRequestException('Locale not found.');
    }

    // Validate agreement if provided
    if (createUserDto.relationshipAgreementId) {
      const agreement = await this.agreementRepository.findOne({
        where: { id: createUserDto.relationshipAgreementId },
      });
      if (!agreement) {
        throw new BadRequestException('Agreement not found.');
      }
    }

    // Validate avatar file if provided
    if (createUserDto.avatarFileId) {
      const file = await this.fileUploadRepository.findOne({
        where: { id: createUserDto.avatarFileId },
      });
      if (!file) {
        throw new BadRequestException('Avatar file not found.');
      }
      if (!file.mimeType.startsWith('image/')) {
        throw new BadRequestException('Avatar must be an image.');
      }
    }

    const passwordHash = await this.hashPassword(createUserDto.password);

    const user = this.userRepository.create({
      email: normalizedEmail,
      passwordHash,
      isActive: createUserDto.isActive ?? true,
      avatarFileId: createUserDto.avatarFileId || null,
      agentId: createUserDto.agentId,
      relationshipAgreementId: createUserDto.relationshipAgreementId || null,
      birthday: createUserDto.birthday ? new Date(createUserDto.birthday) : null,
      joinedAt: createUserDto.joinedAt ? new Date(createUserDto.joinedAt) : null,
      leftAt: createUserDto.leftAt ? new Date(createUserDto.leftAt) : null,
      defaultLocaleId: createUserDto.defaultLocaleId,
    });

    const savedUser = await this.userRepository.save(user);
    return this.findOne(savedUser.id);
  }

  async findAll(params: UserListParams): Promise<UserPaginatedResponse> {
    const page = params.page || 1;
    const pageSize = Math.min(params.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.agent', 'agent')
      .leftJoinAndSelect('user.defaultLocale', 'defaultLocale')
      .leftJoinAndSelect('user.avatarFile', 'avatarFile')
      .leftJoinAndSelect('user.relationshipAgreement', 'relationshipAgreement');

    if (params.q) {
      queryBuilder.andWhere('user.email ILIKE :q', { q: `%${params.q}%` });
    }

    if (params.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive: params.isActive });
    }

    if (params.agentId) {
      queryBuilder.andWhere('user.agentId = :agentId', { agentId: params.agentId });
    }

    if (params.localeId) {
      queryBuilder.andWhere('user.defaultLocaleId = :localeId', { localeId: params.localeId });
    }

    // Handle sorting
    const sort = params.sort || 'createdAt_desc';
    switch (sort) {
      case 'email_asc':
        queryBuilder.orderBy('user.email', 'ASC');
        break;
      case 'email_desc':
        queryBuilder.orderBy('user.email', 'DESC');
        break;
      case 'createdAt_asc':
        queryBuilder.orderBy('user.createdAt', 'ASC');
        break;
      default:
        queryBuilder.orderBy('user.createdAt', 'DESC');
    }

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['agent', 'defaultLocale', 'avatarFile', 'relationshipAgreement'],
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: ILike(email.toLowerCase().trim()) },
      relations: ['agent', 'defaultLocale', 'avatarFile'],
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Check email uniqueness if changing
    if (updateUserDto.email) {
      const normalizedEmail = updateUserDto.email.toLowerCase().trim();
      const existingByEmail = await this.userRepository.findOne({
        where: { email: ILike(normalizedEmail) },
      });
      if (existingByEmail && existingByEmail.id !== id) {
        throw new ConflictException('Email already exists.');
      }
      user.email = normalizedEmail;
    }

    // Check agent uniqueness if changing
    if (updateUserDto.agentId && updateUserDto.agentId !== user.agentId) {
      const existingByAgent = await this.userRepository.findOne({
        where: { agentId: updateUserDto.agentId },
      });
      if (existingByAgent && existingByAgent.id !== id) {
        throw new ConflictException('Agent is already assigned to another user.');
      }
      const agent = await this.agentRepository.findOne({
        where: { id: updateUserDto.agentId },
      });
      if (!agent) {
        throw new BadRequestException('Agent not found.');
      }
      user.agentId = updateUserDto.agentId;
    }

    // Validate locale if changing
    if (updateUserDto.defaultLocaleId && updateUserDto.defaultLocaleId !== user.defaultLocaleId) {
      const locale = await this.localeRepository.findOne({
        where: { id: updateUserDto.defaultLocaleId },
      });
      if (!locale) {
        throw new BadRequestException('Locale not found.');
      }
      user.defaultLocaleId = updateUserDto.defaultLocaleId;
    }

    // Handle relationship agreement
    if (updateUserDto.relationshipAgreementId !== undefined) {
      if (updateUserDto.relationshipAgreementId === null) {
        user.relationshipAgreementId = null;
      } else {
        const agreement = await this.agreementRepository.findOne({
          where: { id: updateUserDto.relationshipAgreementId },
        });
        if (!agreement) {
          throw new BadRequestException('Agreement not found.');
        }
        user.relationshipAgreementId = updateUserDto.relationshipAgreementId;
      }
    }

    // Handle avatar file
    if (updateUserDto.avatarFileId !== undefined) {
      if (updateUserDto.avatarFileId === null) {
        user.avatarFileId = null;
      } else {
        const file = await this.fileUploadRepository.findOne({
          where: { id: updateUserDto.avatarFileId },
        });
        if (!file) {
          throw new BadRequestException('Avatar file not found.');
        }
        if (!file.mimeType.startsWith('image/')) {
          throw new BadRequestException('Avatar must be an image.');
        }
        user.avatarFileId = updateUserDto.avatarFileId;
      }
    }

    if (updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive;
    }

    if (updateUserDto.birthday !== undefined) {
      user.birthday = updateUserDto.birthday ? new Date(updateUserDto.birthday) : null;
    }

    if (updateUserDto.joinedAt !== undefined) {
      user.joinedAt = updateUserDto.joinedAt ? new Date(updateUserDto.joinedAt) : null;
    }

    if (updateUserDto.leftAt !== undefined) {
      user.leftAt = updateUserDto.leftAt ? new Date(updateUserDto.leftAt) : null;
    }

    await this.userRepository.save(user);
    return this.findOne(id);
  }

  async setPassword(id: string, setPasswordDto: SetPasswordDto): Promise<void> {
    const user = await this.findOne(id);
    user.passwordHash = await this.hashPassword(setPasswordDto.newPassword);
    await this.userRepository.save(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async seed(): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0;
    let skipped = 0;

    // Get or create required locales
    let enUSLocale = await this.localeRepository.findOne({ where: { code: 'en-US' } });
    if (!enUSLocale) {
      enUSLocale = await this.localeRepository.save(this.localeRepository.create({ code: 'en-US' }));
    }

    let plPLLocale = await this.localeRepository.findOne({ where: { code: 'pl-PL' } });
    if (!plPLLocale) {
      plPLLocale = await this.localeRepository.save(this.localeRepository.create({ code: 'pl-PL' }));
    }

    // Get or create required agents
    let marketlumAgent = await this.agentRepository.findOne({ where: { name: 'Marketlum' } });
    if (!marketlumAgent) {
      marketlumAgent = await this.agentRepository.save(
        this.agentRepository.create({ name: 'Marketlum', type: 'organization' as any }),
      );
    }

    let pawelAgent = await this.agentRepository.findOne({ where: { name: 'Paweł' } });
    if (!pawelAgent) {
      pawelAgent = await this.agentRepository.save(
        this.agentRepository.create({ name: 'Paweł', type: 'individual' as any }),
      );
    }

    // Seed users
    const seedUsers = [
      {
        email: 'admin@marketlum.com',
        password: 'Admin123!',
        agentId: marketlumAgent.id,
        defaultLocaleId: enUSLocale.id,
        isActive: true,
      },
      {
        email: 'pawel@marketlum.com',
        password: 'Pawel123!',
        agentId: pawelAgent.id,
        defaultLocaleId: plPLLocale.id,
        isActive: true,
      },
    ];

    for (const userData of seedUsers) {
      const existing = await this.userRepository.findOne({
        where: { email: ILike(userData.email) },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Check if agent is already used
      const agentUsed = await this.userRepository.findOne({
        where: { agentId: userData.agentId },
      });
      if (agentUsed) {
        skipped++;
        continue;
      }

      const passwordHash = await this.hashPassword(userData.password);
      const user = this.userRepository.create({
        ...userData,
        passwordHash,
      });
      await this.userRepository.save(user);
      inserted++;
    }

    return { inserted, skipped };
  }
}
