import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateLocaleDto } from './dto/create-locale.dto';
import { UpdateLocaleDto } from './dto/update-locale.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Locale } from './entities/locale.entity';

export interface LocalePaginatedResponse {
  data: Locale[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LocaleListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: string;
}

@Injectable()
export class LocalesService {
  constructor(
    @InjectRepository(Locale)
    private localeRepository: Repository<Locale>,
  ) {}

  private normalizeCode(code: string): string {
    const trimmed = code.trim();
    const parts = trimmed.split('-');
    if (parts.length === 1) {
      return parts[0].toLowerCase();
    }
    return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
  }

  async create(createLocaleDto: CreateLocaleDto): Promise<Locale> {
    const normalizedCode = this.normalizeCode(createLocaleDto.code);

    const existing = await this.localeRepository.findOne({
      where: { code: ILike(normalizedCode) },
    });

    if (existing) {
      throw new ConflictException('Locale code already exists.');
    }

    const locale = this.localeRepository.create({
      code: normalizedCode,
    });

    return this.localeRepository.save(locale);
  }

  async findAll(params: LocaleListParams): Promise<LocalePaginatedResponse> {
    const page = params.page || 1;
    const pageSize = Math.min(params.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.localeRepository.createQueryBuilder('locale');

    if (params.q) {
      queryBuilder.where('locale.code ILIKE :q', { q: `%${params.q}%` });
    }

    // Handle sorting
    const sort = params.sort || 'createdAt_desc';
    if (sort === 'code_asc') {
      queryBuilder.orderBy('locale.code', 'ASC');
    } else {
      queryBuilder.orderBy('locale.createdAt', 'DESC');
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

  async findOne(id: string): Promise<Locale> {
    const locale = await this.localeRepository.findOne({ where: { id } });
    if (!locale) {
      throw new NotFoundException('Locale not found.');
    }
    return locale;
  }

  async update(id: string, updateLocaleDto: UpdateLocaleDto): Promise<Locale> {
    const locale = await this.findOne(id);

    if (updateLocaleDto.code) {
      const normalizedCode = this.normalizeCode(updateLocaleDto.code);

      const existing = await this.localeRepository.findOne({
        where: { code: ILike(normalizedCode) },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Locale code already exists.');
      }

      locale.code = normalizedCode;
    }

    return this.localeRepository.save(locale);
  }

  async remove(id: string): Promise<void> {
    const locale = await this.findOne(id);
    await this.localeRepository.remove(locale);
  }

  async seed(): Promise<{ inserted: number; skipped: number }> {
    const seedCodes = ['en-US', 'en-GB', 'pl-PL', 'de-DE', 'fr-FR', 'es-ES'];
    let inserted = 0;
    let skipped = 0;

    for (const code of seedCodes) {
      const normalizedCode = this.normalizeCode(code);
      const existing = await this.localeRepository.findOne({
        where: { code: ILike(normalizedCode) },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const locale = this.localeRepository.create({ code: normalizedCode });
      await this.localeRepository.save(locale);
      inserted++;
    }

    return { inserted, skipped };
  }
}
