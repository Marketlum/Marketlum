import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import {
  CreateExchangeRateInput,
  UpdateExchangeRateInput,
  ExchangeRateQuery,
  canonicaliseRate,
  invertRate,
} from '@marketlum/shared';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { Value } from '../values/entities/value.entity';

interface RateLookupResult {
  rate: string;
  sourceRowId: string;
  effectiveAt: Date;
  fromValueId: string;
  toValueId: string;
}

@Injectable()
export class ExchangeRatesService {
  constructor(
    @InjectRepository(ExchangeRate)
    private readonly rateRepository: Repository<ExchangeRate>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
  ) {}

  async create(input: CreateExchangeRateInput): Promise<ExchangeRate> {
    if (input.fromValueId === input.toValueId) {
      throw new BadRequestException('fromValueId and toValueId must differ');
    }

    await this.assertValueExists(input.fromValueId);
    await this.assertValueExists(input.toValueId);

    const canonical = canonicaliseRate({
      fromValueId: input.fromValueId,
      toValueId: input.toValueId,
      rate: input.rate,
    });

    const rate = this.rateRepository.create({
      fromValueId: canonical.fromValueId,
      toValueId: canonical.toValueId,
      rate: canonical.rate,
      effectiveAt: new Date(input.effectiveAt),
      source: input.source ?? null,
    });

    try {
      const saved = await this.rateRepository.save(rate);
      return this.findOne(saved.id);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === '23505'
      ) {
        throw new ConflictException(
          'A rate for this value pair already exists at this effectiveAt',
        );
      }
      throw error;
    }
  }

  async findAll(query: ExchangeRateQuery) {
    const { page, limit, sortBy, sortOrder, fromValueId, toValueId, at } = query;
    const skip = (page - 1) * limit;

    const qb = this.rateRepository
      .createQueryBuilder('rate')
      .leftJoinAndSelect('rate.fromValue', 'fromValue')
      .leftJoinAndSelect('rate.toValue', 'toValue');

    if (fromValueId && toValueId) {
      const [lo, hi] =
        fromValueId < toValueId
          ? [fromValueId, toValueId]
          : [toValueId, fromValueId];
      qb.andWhere('rate.fromValueId = :lo AND rate.toValueId = :hi', { lo, hi });
    } else if (fromValueId) {
      qb.andWhere('(rate.fromValueId = :id OR rate.toValueId = :id)', {
        id: fromValueId,
      });
    } else if (toValueId) {
      qb.andWhere('(rate.fromValueId = :id OR rate.toValueId = :id)', {
        id: toValueId,
      });
    }

    if (at) {
      qb.andWhere('rate.effectiveAt <= :at', { at: new Date(at) });
    }

    const allowedSortBy = new Set(['effectiveAt', 'rate', 'createdAt', 'updatedAt']);
    const sortColumn = sortBy && allowedSortBy.has(sortBy) ? sortBy : 'effectiveAt';
    qb.orderBy(`rate.${sortColumn}`, sortOrder);

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<ExchangeRate> {
    const rate = await this.rateRepository.findOne({
      where: { id },
      relations: ['fromValue', 'toValue'],
    });
    if (!rate) throw new NotFoundException('Exchange rate not found');
    return rate;
  }

  async update(id: string, input: UpdateExchangeRateInput): Promise<ExchangeRate> {
    const rate = await this.findOne(id);

    const nextFrom = input.fromValueId ?? rate.fromValueId;
    const nextTo = input.toValueId ?? rate.toValueId;
    const nextRate = input.rate ?? rate.rate;

    if (nextFrom === nextTo) {
      throw new BadRequestException('fromValueId and toValueId must differ');
    }
    if (input.fromValueId) await this.assertValueExists(input.fromValueId);
    if (input.toValueId) await this.assertValueExists(input.toValueId);

    const canonical = canonicaliseRate({
      fromValueId: nextFrom,
      toValueId: nextTo,
      rate: nextRate,
    });

    rate.fromValueId = canonical.fromValueId;
    rate.toValueId = canonical.toValueId;
    rate.rate = canonical.rate;
    if (input.effectiveAt !== undefined) {
      rate.effectiveAt = new Date(input.effectiveAt);
    }
    if (input.source !== undefined) {
      rate.source = input.source;
    }

    delete (rate as unknown as { fromValue?: unknown }).fromValue;
    delete (rate as unknown as { toValue?: unknown }).toValue;

    try {
      await this.rateRepository.save(rate);
      return this.findOne(id);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === '23505'
      ) {
        throw new ConflictException(
          'A rate for this value pair already exists at this effectiveAt',
        );
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const rate = await this.findOne(id);
    await this.rateRepository.remove(rate);
  }

  async lookup(
    fromValueId: string,
    toValueId: string,
    at: Date = new Date(),
  ): Promise<RateLookupResult | null> {
    if (fromValueId === toValueId) return null;
    const [lo, hi] =
      fromValueId < toValueId
        ? [fromValueId, toValueId]
        : [toValueId, fromValueId];

    const row = await this.rateRepository.findOne({
      where: {
        fromValueId: lo,
        toValueId: hi,
        effectiveAt: LessThanOrEqual(at),
      },
      order: { effectiveAt: 'DESC' },
    });

    if (!row) return null;

    const requestIsCanonical = fromValueId === lo;
    return {
      rate: requestIsCanonical ? row.rate : invertRate(row.rate),
      sourceRowId: row.id,
      effectiveAt: row.effectiveAt,
      fromValueId,
      toValueId,
    };
  }

  private async assertValueExists(id: string) {
    const exists = await this.valueRepository.exist({ where: { id } });
    if (!exists) throw new NotFoundException('Value not found');
  }
}
