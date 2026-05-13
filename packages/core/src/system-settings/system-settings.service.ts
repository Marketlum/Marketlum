import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity';
import { Value } from '../values/entities/value.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import { RecurringFlow } from '../recurring-flows/entities/recurring-flow.entity';

export const BASE_VALUE_KEY = 'base_value_id';

export interface BaseValueResponse {
  baseValueId: string | null;
  baseValue: { id: string; name: string; type: string } | null;
  snapshotsExist: boolean;
}

@Injectable()
export class SystemSettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepository: Repository<SystemSetting>,
    @InjectRepository(Value)
    private readonly valueRepository: Repository<Value>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepository: Repository<InvoiceItem>,
    @InjectRepository(RecurringFlow)
    private readonly recurringFlowRepository: Repository<RecurringFlow>,
  ) {}

  async getBaseValue(): Promise<BaseValueResponse> {
    const baseValueId = await this.getBaseValueId();
    const baseValue = baseValueId
      ? await this.valueRepository.findOne({ where: { id: baseValueId } })
      : null;
    const snapshotsExist = await this.anySnapshotsExist();
    return {
      baseValueId,
      baseValue: baseValue
        ? { id: baseValue.id, name: baseValue.name, type: baseValue.type }
        : null,
      snapshotsExist,
    };
  }

  async setBaseValue(baseValueId: string | null): Promise<BaseValueResponse> {
    const snapshotsExist = await this.anySnapshotsExist();
    if (snapshotsExist) {
      throw new ConflictException(
        'Cannot change system base value while snapshot rows exist',
      );
    }

    if (baseValueId !== null) {
      const exists = await this.valueRepository.exist({
        where: { id: baseValueId },
      });
      if (!exists) throw new NotFoundException('Value not found');
    }

    if (baseValueId === null) {
      await this.settingsRepository.delete({ key: BASE_VALUE_KEY });
    } else {
      await this.settingsRepository.upsert(
        { key: BASE_VALUE_KEY, value: baseValueId },
        ['key'],
      );
    }

    return this.getBaseValue();
  }

  async getBaseValueId(): Promise<string | null> {
    const row = await this.settingsRepository.findOne({
      where: { key: BASE_VALUE_KEY },
    });
    return row ? row.value : null;
  }

  private async anySnapshotsExist(): Promise<boolean> {
    const tablesExist = await this.snapshotColumnsExist();
    if (!tablesExist) return false;

    const invoiceCount = await this.invoiceItemRepository
      .createQueryBuilder('item')
      .where('item.rateUsed IS NOT NULL OR item.baseAmount IS NOT NULL')
      .getCount()
      .catch(() => 0);

    if (invoiceCount > 0) return true;

    const recurringCount = await this.recurringFlowRepository
      .createQueryBuilder('flow')
      .where('flow.rateUsed IS NOT NULL OR flow.baseAmount IS NOT NULL')
      .getCount()
      .catch(() => 0);

    return recurringCount > 0;
  }

  private async snapshotColumnsExist(): Promise<boolean> {
    // PR 2 adds the snapshot columns. Until that migration is applied this
    // service always returns false for snapshotsExist, which is the
    // intentional behaviour: there is nothing to lock against yet.
    try {
      await this.invoiceItemRepository
        .createQueryBuilder('item')
        .select('item.id')
        .where('item.rateUsed IS NOT NULL')
        .limit(1)
        .getRawOne();
      return true;
    } catch {
      return false;
    }
  }
}
