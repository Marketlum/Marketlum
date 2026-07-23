import { User } from '../users/entities/user.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Taxonomy } from '../taxonomies/entities/taxonomy.entity';
import { File } from '../files/entities/file.entity';
import { Value } from '../values/entities/value.entity';
import { Perspective } from '../perspectives/entities/perspective.entity';
import { ValueInstance } from '../value-instances/entities/value-instance.entity';
import { ValueStream } from '../value-streams/entities/value-stream.entity';
import { Account } from '../ledger/entities/account.entity';
import { Transaction } from '../ledger/entities/transaction.entity';
import { Agreement } from '../agreements/entities/agreement.entity';
import { Channel } from '../channels/channel.entity';
import { Offering } from '../offerings/entities/offering.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Exchange } from '../exchanges/entities/exchange.entity';
import { Order } from '../orders/entities/order.entity';
import { Geography } from '../geographies/geography.entity';
import { Archetype } from '../archetypes/entities/archetype.entity';
import { Locale } from '../locales/locale.entity';
import { AgreementTemplate } from '../agreement-templates/entities/agreement-template.entity';
import { Pipeline } from '../pipelines/entities/pipeline.entity';
import { Tension } from '../tensions/entities/tension.entity';
import { ExchangeRate } from '../exchange-rates/entities/exchange-rate.entity';
import { SystemSetting } from '../system-settings/entities/system-setting.entity';
import { ApiKey } from '../api-keys/entities/api-key.entity';
import { Role } from '../roles/entities/role.entity';

export interface PrimaryEntityDescriptor {
  cls: Function;
  snakeName: string;
  // Redacts secrets from event payloads before they reach subscribers.
  sanitize?: (entity: unknown) => unknown;
}

function stripKeyHash(entity: unknown): unknown {
  const { keyHash: _, ...rest } = entity as ApiKey;
  return rest;
}

export const PRIMARY_ENTITIES: PrimaryEntityDescriptor[] = [
  { cls: User, snakeName: 'user' },
  { cls: Agent, snakeName: 'agent' },
  { cls: Taxonomy, snakeName: 'taxonomy' },
  { cls: File, snakeName: 'file' },
  { cls: Value, snakeName: 'value' },
  { cls: Perspective, snakeName: 'perspective' },
  { cls: ValueInstance, snakeName: 'value_instance' },
  { cls: ValueStream, snakeName: 'value_stream' },
  { cls: Account, snakeName: 'account' },
  { cls: Transaction, snakeName: 'transaction' },
  { cls: Agreement, snakeName: 'agreement' },
  { cls: Channel, snakeName: 'channel' },
  { cls: Offering, snakeName: 'offering' },
  { cls: Invoice, snakeName: 'invoice' },
  { cls: Order, snakeName: 'order' },
  { cls: Exchange, snakeName: 'exchange' },
  { cls: Geography, snakeName: 'geography' },
  { cls: Archetype, snakeName: 'archetype' },
  { cls: Locale, snakeName: 'locale' },
  { cls: AgreementTemplate, snakeName: 'agreement_template' },
  { cls: Pipeline, snakeName: 'pipeline' },
  { cls: Tension, snakeName: 'tension' },
  { cls: ExchangeRate, snakeName: 'exchange_rate' },
  { cls: SystemSetting, snakeName: 'system_setting' },
  { cls: ApiKey, snakeName: 'api_key', sanitize: stripKeyHash },
  { cls: Role, snakeName: 'role' },
];

const byCls = new Map<Function, PrimaryEntityDescriptor>(
  PRIMARY_ENTITIES.map((d) => [d.cls, d]),
);

export function primaryEntityDescriptor(
  target: Function | string,
): PrimaryEntityDescriptor | undefined {
  if (typeof target === 'function') {
    return byCls.get(target);
  }
  return PRIMARY_ENTITIES.find((d) => d.snakeName === target);
}

export function primaryEntitySnakeName(target: Function | string): string | undefined {
  return primaryEntityDescriptor(target)?.snakeName;
}
