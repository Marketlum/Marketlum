import { User } from './users/entities/user.entity';
import { Agent } from './agents/entities/agent.entity';
import { Taxonomy } from './taxonomies/entities/taxonomy.entity';
import { Folder } from './files/entities/folder.entity';
import { File } from './files/entities/file.entity';
import { Value } from './values/entities/value.entity';
import { ValueImage } from './values/entities/value-image.entity';
import { Perspective } from './perspectives/entities/perspective.entity';
import { ValueInstance } from './value-instances/entities/value-instance.entity';
import { ValueStream } from './value-streams/entities/value-stream.entity';
import { Account } from './ledger/entities/account.entity';
import { Transaction } from './ledger/entities/transaction.entity';
import { Agreement } from './agreements/entities/agreement.entity';
import { Channel } from './channels/channel.entity';
import { Offering } from './offerings/entities/offering.entity';
import { OfferingComponent } from './offerings/entities/offering-component.entity';
import { Invoice } from './invoices/entities/invoice.entity';
import { InvoiceItem } from './invoices/entities/invoice-item.entity';
import { Exchange } from './exchanges/entities/exchange.entity';
import { ExchangeParty } from './exchanges/entities/exchange-party.entity';
import { ExchangeFlow } from './exchanges/entities/exchange-flow.entity';
import { Geography } from './geographies/geography.entity';
import { Archetype } from './archetypes/entities/archetype.entity';
import { Locale } from './locales/locale.entity';
import { AgreementTemplate } from './agreement-templates/entities/agreement-template.entity';
import { Pipeline } from './pipelines/entities/pipeline.entity';
import { Tension } from './tensions/entities/tension.entity';
import { RecurringFlow } from './recurring-flows/entities/recurring-flow.entity';

export const ALL_ENTITIES = [
  User,
  Agent,
  Taxonomy,
  Folder,
  File,
  Value,
  ValueImage,
  Perspective,
  ValueInstance,
  ValueStream,
  Account,
  Transaction,
  Agreement,
  Channel,
  Offering,
  OfferingComponent,
  Invoice,
  InvoiceItem,
  Exchange,
  ExchangeParty,
  ExchangeFlow,
  Geography,
  Archetype,
  Locale,
  AgreementTemplate,
  Pipeline,
  Tension,
  RecurringFlow,
];
