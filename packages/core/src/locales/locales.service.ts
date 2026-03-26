import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Locale } from './locale.entity';
import type { CreateLocaleInput, PaginationQuery, PaginatedResponse } from '@marketlum/shared';

@Injectable()
export class LocalesService {
  constructor(
    @InjectRepository(Locale)
    private readonly localeRepository: Repository<Locale>,
  ) {}

  async create(input: CreateLocaleInput): Promise<Locale> {
    const locale = this.localeRepository.create(input);
    try {
      return await this.localeRepository.save(locale);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === '23505'
      ) {
        throw new ConflictException('Locale with this code already exists');
      }
      throw error;
    }
  }

  async findAll(query: PaginationQuery): Promise<PaginatedResponse<Locale>> {
    const { page, limit, sortBy, sortOrder } = query;

    const qb = this.localeRepository.createQueryBuilder('locale');

    if (sortBy) {
      qb.orderBy(`locale.${sortBy}`, sortOrder);
    } else {
      qb.orderBy('locale.code', 'ASC');
    }

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async remove(id: string): Promise<void> {
    const locale = await this.localeRepository.findOne({ where: { id } });
    if (!locale) {
      throw new NotFoundException('Locale not found');
    }
    await this.localeRepository.remove(locale);
  }
}
