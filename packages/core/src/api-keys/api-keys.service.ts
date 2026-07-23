import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { ApiKey } from './entities/api-key.entity';
import { User } from '../users/entities/user.entity';
import { CreateApiKeyInput } from '@marketlum/shared';

export const API_KEY_TOKEN_PREFIX = 'mlm_';
const DISPLAY_PREFIX_LENGTH = 12;
const LAST_USED_THROTTLE_MS = 60_000;

export function hashApiKey(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface ApiKeySummaryView {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  async create(
    userId: string,
    input: CreateApiKeyInput,
  ): Promise<ApiKeySummaryView & { key: string }> {
    const key = API_KEY_TOKEN_PREFIX + randomBytes(32).toString('base64url');

    const apiKey = this.apiKeyRepository.create({
      name: input.name,
      prefix: key.slice(0, DISPLAY_PREFIX_LENGTH),
      keyHash: hashApiKey(key),
      userId,
      expiresAt: input.expiresAt ?? null,
    });
    const saved = await this.apiKeyRepository.save(apiKey);

    return { ...this.toSummary(saved), key };
  }

  async findAllForUser(userId: string): Promise<ApiKeySummaryView[]> {
    const keys = await this.apiKeyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return keys.map((k) => this.toSummary(k));
  }

  async remove(userId: string, id: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findOne({ where: { id, userId } });
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }
    await this.apiKeyRepository.remove(apiKey);
  }

  async verify(token: string): Promise<User | null> {
    if (!token.startsWith(API_KEY_TOKEN_PREFIX)) return null;

    const apiKey = await this.apiKeyRepository.findOne({
      where: { keyHash: hashApiKey(token) },
      relations: ['user'],
    });
    if (!apiKey) return null;
    if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now()) return null;

    this.touchLastUsed(apiKey);
    return apiKey.user;
  }

  // Fire-and-forget, at most once per minute per key; a failed touch must
  // never fail the authenticated request.
  private touchLastUsed(apiKey: ApiKey): void {
    if (
      apiKey.lastUsedAt &&
      Date.now() - apiKey.lastUsedAt.getTime() < LAST_USED_THROTTLE_MS
    ) {
      return;
    }
    this.apiKeyRepository
      .query(`UPDATE "api_keys" SET "lastUsedAt" = now() WHERE "id" = $1`, [apiKey.id])
      .catch(() => {});
  }

  private toSummary(apiKey: ApiKey): ApiKeySummaryView {
    return {
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }
}
