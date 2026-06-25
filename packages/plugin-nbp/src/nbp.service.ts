import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { canonicaliseRate, formatRate } from '@marketlum/shared';
import { ExchangeRate, Value, PluginSettingsService } from '@marketlum/core';
import { NbpClient } from './nbp.client';
import {
  NbpSettings,
  NBP_PLUGIN_ID,
  NBP_RATE_SOURCE,
  PLN_CODE,
} from './shared/settings';

export interface NbpSyncSummary {
  effectiveDate: string | null;
  updated: string[];
  skipped: string[];
  errors: string[];
}

@Injectable()
export class NbpService {
  private readonly logger = new Logger('NbpPlugin');

  constructor(
    @InjectRepository(ExchangeRate)
    private readonly rateRepo: Repository<ExchangeRate>,
    @InjectRepository(Value)
    private readonly valueRepo: Repository<Value>,
    private readonly pluginSettings: PluginSettingsService,
    private readonly client: NbpClient,
  ) {}

  /** Fetch the latest NBP table A and upsert rates for tracked currencies. */
  async sync(): Promise<NbpSyncSummary> {
    const settings = await this.pluginSettings.get<NbpSettings>(NBP_PLUGIN_ID);
    const summary: NbpSyncSummary = {
      effectiveDate: null,
      updated: [],
      skipped: [],
      errors: [],
    };

    if (settings.trackedCurrencies.length === 0) return summary;

    let table;
    try {
      table = await this.client.fetchTableA();
    } catch (error) {
      const message = `Failed to fetch NBP table A: ${(error as Error).message}`;
      summary.errors.push(message);
      this.logger.warn(message);
      return summary;
    }
    summary.effectiveDate = table.effectiveDate;

    const pln = await this.valueRepo.findOne({ where: { code: PLN_CODE } });
    if (!pln) {
      const message = `No currency Value with code "${PLN_CODE}" exists`;
      summary.errors.push(message);
      this.logger.warn(message);
      return summary;
    }

    const effectiveAt = new Date(table.effectiveDate);

    for (const code of settings.trackedCurrencies) {
      const entry = table.rates.find((r) => r.code === code);
      if (!entry) {
        summary.skipped.push(code);
        continue;
      }
      const value = await this.valueRepo.findOne({ where: { code } });
      if (!value) {
        summary.skipped.push(code);
        continue;
      }
      try {
        const result = await this.upsert(value.id, pln.id, entry.mid, effectiveAt);
        if (result === 'written') summary.updated.push(code);
        else summary.skipped.push(code); // existing manual rate, left untouched
      } catch (error) {
        const message = `${code}: ${(error as Error).message}`;
        summary.errors.push(message);
        this.logger.warn(`NBP ingest error for ${message}`);
      }
    }

    return summary;
  }

  /**
   * Upsert a single NBP-sourced rate, canonicalising the pair the same way the
   * core ExchangeRatesService does. Never overwrites a manually entered rate.
   */
  private async upsert(
    fromValueId: string,
    toValueId: string,
    mid: number,
    effectiveAt: Date,
  ): Promise<'written' | 'protected'> {
    const canonical = canonicaliseRate({
      fromValueId,
      toValueId,
      rate: formatRate(String(mid)),
    });

    const existing = await this.rateRepo.findOne({
      where: {
        fromValueId: canonical.fromValueId,
        toValueId: canonical.toValueId,
        effectiveAt,
      },
    });

    if (existing) {
      if (existing.source !== NBP_RATE_SOURCE) return 'protected';
      existing.rate = canonical.rate;
      await this.rateRepo.save(existing);
      return 'written';
    }

    const row = this.rateRepo.create({
      fromValueId: canonical.fromValueId,
      toValueId: canonical.toValueId,
      rate: canonical.rate,
      effectiveAt,
      source: NBP_RATE_SOURCE,
    });
    await this.rateRepo.save(row);
    return 'written';
  }
}
