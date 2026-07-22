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

export const PRESENTATION_CURRENCY_KEY = 'presentation_currency_id';

export interface PresentationCurrencyResponse {
  presentationCurrencyId: string | null;
  presentationCurrency: { id: string; name: string; type: string } | null;
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
  ) {}

  async getPresentationCurrency(): Promise<PresentationCurrencyResponse> {
    const presentationCurrencyId = await this.getPresentationCurrencyId();
    const presentationCurrency = presentationCurrencyId
      ? await this.valueRepository.findOne({ where: { id: presentationCurrencyId } })
      : null;
    const snapshotsExist = await this.anySnapshotsExist();
    return {
      presentationCurrencyId,
      presentationCurrency: presentationCurrency
        ? { id: presentationCurrency.id, name: presentationCurrency.name, type: presentationCurrency.type }
        : null,
      snapshotsExist,
    };
  }

  async setPresentationCurrency(
    presentationCurrencyId: string | null,
  ): Promise<PresentationCurrencyResponse> {
    const snapshotsExist = await this.anySnapshotsExist();
    if (snapshotsExist) {
      throw new ConflictException(
        'Cannot change presentation currency while snapshot rows exist',
      );
    }

    if (presentationCurrencyId !== null) {
      const exists = await this.valueRepository.exist({
        where: { id: presentationCurrencyId },
      });
      if (!exists) throw new NotFoundException('Value not found');
    }

    if (presentationCurrencyId === null) {
      await this.settingsRepository.delete({ key: PRESENTATION_CURRENCY_KEY });
    } else {
      await this.settingsRepository.upsert(
        { key: PRESENTATION_CURRENCY_KEY, value: presentationCurrencyId },
        ['key'],
      );
    }

    return this.getPresentationCurrency();
  }

  async getPresentationCurrencyId(): Promise<string | null> {
    const row = await this.settingsRepository.findOne({
      where: { key: PRESENTATION_CURRENCY_KEY },
    });
    return row ? row.value : null;
  }

  private async anySnapshotsExist(): Promise<boolean> {
    const invoiceCount = await this.invoiceItemRepository
      .createQueryBuilder('item')
      .where('item.presentationRate IS NOT NULL OR item.presentationAmount IS NOT NULL')
      .getCount()
      .catch(() => 0);

    return invoiceCount > 0;
  }
}
