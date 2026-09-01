export interface DomainEventEnvelope<TName extends string = string, TEntity = unknown> {
  name: TName;
  occurredAt: string;
  payload: {
    id: string;
    code?: string;
    entity: TEntity;
  };
}

export type UserCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.user.created', T>;
export type UserUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.user.updated', T>;
export type UserDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.user.deleted', T>;

export type ActorCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.actor.created', T>;
export type ActorUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.actor.updated', T>;
export type ActorDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.actor.deleted', T>;

export type TaxonomyCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.taxonomy.created', T>;
export type TaxonomyUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.taxonomy.updated', T>;
export type TaxonomyDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.taxonomy.deleted', T>;

export type FileCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.file.created', T>;
export type FileUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.file.updated', T>;
export type FileDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.file.deleted', T>;

export type ValueCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.value.created', T>;
export type ValueUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.value.updated', T>;
export type ValueDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.value.deleted', T>;

export type PerspectiveCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.perspective.created', T>;
export type PerspectiveUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.perspective.updated', T>;
export type PerspectiveDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.perspective.deleted', T>;

export type ValueInstanceCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.value_instance.created', T>;
export type ValueInstanceUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.value_instance.updated', T>;
export type ValueInstanceDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.value_instance.deleted', T>;

export type ValueStreamCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.value_stream.created', T>;
export type ValueStreamUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.value_stream.updated', T>;
export type ValueStreamDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.value_stream.deleted', T>;

export type AccountCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.account.created', T>;
export type AccountUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.account.updated', T>;
export type AccountDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.account.deleted', T>;

export type TransactionCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.transaction.created', T>;
export type TransactionUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.transaction.updated', T>;
export type TransactionDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.transaction.deleted', T>;

export type AgreementCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.agreement.created', T>;
export type AgreementUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.agreement.updated', T>;
export type AgreementDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.agreement.deleted', T>;

export type ChannelCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.channel.created', T>;
export type ChannelUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.channel.updated', T>;
export type ChannelDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.channel.deleted', T>;

export type OfferingCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.offering.created', T>;
export type OfferingUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.offering.updated', T>;
export type OfferingDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.offering.deleted', T>;

export type InvoiceCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.invoice.created', T>;
export type InvoiceUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.invoice.updated', T>;
export type InvoiceDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.invoice.deleted', T>;

export type OrderCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.order.created', T>;
export type OrderUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.order.updated', T>;
export type OrderDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.order.deleted', T>;

export type ExchangeCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.exchange.created', T>;
export type ExchangeUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.exchange.updated', T>;
export type ExchangeDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.exchange.deleted', T>;

export type GeographyCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.geography.created', T>;
export type GeographyUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.geography.updated', T>;
export type GeographyDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.geography.deleted', T>;

export type ArchetypeCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.archetype.created', T>;
export type ArchetypeUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.archetype.updated', T>;
export type ArchetypeDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.archetype.deleted', T>;

export type LocaleCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.locale.created', T>;
export type LocaleUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.locale.updated', T>;
export type LocaleDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.locale.deleted', T>;

export type AgreementTemplateCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.agreement_template.created', T>;
export type AgreementTemplateUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.agreement_template.updated', T>;
export type AgreementTemplateDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.agreement_template.deleted', T>;

export type PipelineCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.pipeline.created', T>;
export type PipelineUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.pipeline.updated', T>;
export type PipelineDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.pipeline.deleted', T>;

// Tensions are event-sourced (spec 027): the store emits one intent-carrying
// verb per domain event instead of the created/updated/deleted triplet.
export type TensionSensedEvent<T = unknown> = DomainEventEnvelope<'marketlum.tension.sensed', T>;
export type TensionRenamedEvent<T = unknown> = DomainEventEnvelope<'marketlum.tension.renamed', T>;
export type TensionRescoredEvent<T = unknown> = DomainEventEnvelope<'marketlum.tension.rescored', T>;
export type TensionContextRevisedEvent<T = unknown> = DomainEventEnvelope<'marketlum.tension.context_revised', T>;
export type TensionLeadAssignedEvent<T = unknown> = DomainEventEnvelope<'marketlum.tension.lead_assigned', T>;
export type TensionLeadUnassignedEvent<T = unknown> = DomainEventEnvelope<'marketlum.tension.lead_unassigned', T>;
export type TensionReassignedEvent<T = unknown> = DomainEventEnvelope<'marketlum.tension.reassigned', T>;
export type TensionResolvedEvent<T = unknown> = DomainEventEnvelope<'marketlum.tension.resolved', T>;
export type TensionDroppedEvent<T = unknown> = DomainEventEnvelope<'marketlum.tension.dropped', T>;
export type TensionReopenedEvent<T = unknown> = DomainEventEnvelope<'marketlum.tension.reopened', T>;
export type TensionRevivedEvent<T = unknown> = DomainEventEnvelope<'marketlum.tension.revived', T>;
export type TensionDiscardedEvent<T = unknown> = DomainEventEnvelope<'marketlum.tension.discarded', T>;


export type ExchangeRateCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.exchange_rate.created', T>;
export type ExchangeRateUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.exchange_rate.updated', T>;
export type ExchangeRateDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.exchange_rate.deleted', T>;

export type SystemSettingCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.system_setting.created', T>;
export type SystemSettingUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.system_setting.updated', T>;
export type SystemSettingDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.system_setting.deleted', T>;

// API keys are immutable after creation, so no `updated` event exists.
// Payloads never carry the key hash (stripped by the domain-event subscriber).
export type ApiKeyCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.api_key.created', T>;
export type ApiKeyDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.api_key.deleted', T>;

export type RoleCreatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.role.created', T>;
export type RoleUpdatedEvent<T = unknown> = DomainEventEnvelope<'marketlum.role.updated', T>;
export type RoleDeletedEvent<T = unknown> = DomainEventEnvelope<'marketlum.role.deleted', T>;

export type DomainEvent =
  | UserCreatedEvent | UserUpdatedEvent | UserDeletedEvent
  | ActorCreatedEvent | ActorUpdatedEvent | ActorDeletedEvent
  | TaxonomyCreatedEvent | TaxonomyUpdatedEvent | TaxonomyDeletedEvent
  | FileCreatedEvent | FileUpdatedEvent | FileDeletedEvent
  | ValueCreatedEvent | ValueUpdatedEvent | ValueDeletedEvent
  | PerspectiveCreatedEvent | PerspectiveUpdatedEvent | PerspectiveDeletedEvent
  | ValueInstanceCreatedEvent | ValueInstanceUpdatedEvent | ValueInstanceDeletedEvent
  | ValueStreamCreatedEvent | ValueStreamUpdatedEvent | ValueStreamDeletedEvent
  | AccountCreatedEvent | AccountUpdatedEvent | AccountDeletedEvent
  | TransactionCreatedEvent | TransactionUpdatedEvent | TransactionDeletedEvent
  | AgreementCreatedEvent | AgreementUpdatedEvent | AgreementDeletedEvent
  | ChannelCreatedEvent | ChannelUpdatedEvent | ChannelDeletedEvent
  | OfferingCreatedEvent | OfferingUpdatedEvent | OfferingDeletedEvent
  | InvoiceCreatedEvent | InvoiceUpdatedEvent | InvoiceDeletedEvent
  | OrderCreatedEvent | OrderUpdatedEvent | OrderDeletedEvent
  | ExchangeCreatedEvent | ExchangeUpdatedEvent | ExchangeDeletedEvent
  | GeographyCreatedEvent | GeographyUpdatedEvent | GeographyDeletedEvent
  | ArchetypeCreatedEvent | ArchetypeUpdatedEvent | ArchetypeDeletedEvent
  | LocaleCreatedEvent | LocaleUpdatedEvent | LocaleDeletedEvent
  | AgreementTemplateCreatedEvent | AgreementTemplateUpdatedEvent | AgreementTemplateDeletedEvent
  | PipelineCreatedEvent | PipelineUpdatedEvent | PipelineDeletedEvent
  | TensionSensedEvent | TensionRenamedEvent | TensionRescoredEvent
  | TensionContextRevisedEvent | TensionLeadAssignedEvent | TensionLeadUnassignedEvent
  | TensionReassignedEvent | TensionResolvedEvent | TensionDroppedEvent
  | TensionReopenedEvent | TensionRevivedEvent | TensionDiscardedEvent
  | ExchangeRateCreatedEvent | ExchangeRateUpdatedEvent | ExchangeRateDeletedEvent
  | SystemSettingCreatedEvent | SystemSettingUpdatedEvent | SystemSettingDeletedEvent
  | ApiKeyCreatedEvent | ApiKeyDeletedEvent
  | RoleCreatedEvent | RoleUpdatedEvent | RoleDeletedEvent;
