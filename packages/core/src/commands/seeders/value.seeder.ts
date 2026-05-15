import { faker } from '@faker-js/faker';
import { ValuesService } from '../../values/values.service';
import { ValueType, ValueLifecycleStage, ValueParentType } from '@marketlum/shared';

interface ValueDeps {
  taxonomies: { all: Array<{ id: string }> };
  agents: Array<{ id: string }>;
  valueStreams: { all: Array<{ id: string }> };
}

interface ValueNode {
  code: string;
  name: string;
  type: ValueType;
  purpose: string;
  lifecycleStage: ValueLifecycleStage;
  children?: Array<ValueNode & { parentType: ValueParentType }>;
}

const VALUE_TREE: ValueNode[] = [
  {
    code: 'cloud_platform',
    name: 'Cloud Platform',
    type: ValueType.PRODUCT,
    purpose: 'Core cloud infrastructure platform',
    lifecycleStage: ValueLifecycleStage.STABLE,
    children: [
      { code: 'compute_engine', name: 'Compute Engine', type: ValueType.PRODUCT, purpose: 'Virtual machine provisioning and management', lifecycleStage: ValueLifecycleStage.STABLE, parentType: ValueParentType.PART_OF },
      { code: 'object_storage', name: 'Object Storage', type: ValueType.PRODUCT, purpose: 'Scalable blob and file storage', lifecycleStage: ValueLifecycleStage.STABLE, parentType: ValueParentType.PART_OF },
      { code: 'data_analytics_suite', name: 'Data Analytics Suite', type: ValueType.PRODUCT, purpose: 'Business intelligence and analytics toolset', lifecycleStage: ValueLifecycleStage.BETA, parentType: ValueParentType.ON_TOP_OF },
    ],
  },
  {
    code: 'integration_middleware',
    name: 'Integration Middleware',
    type: ValueType.PRODUCT,
    purpose: 'API gateway and integration layer',
    lifecycleStage: ValueLifecycleStage.STABLE,
    children: [
      { code: 'api_access_token', name: 'API Access Token', type: ValueType.RIGHT, purpose: 'Programmatic access to platform APIs', lifecycleStage: ValueLifecycleStage.STABLE, parentType: ValueParentType.PART_OF },
      { code: 'webhook_service', name: 'Webhook Service', type: ValueType.SERVICE, purpose: 'Event-driven integration via webhooks', lifecycleStage: ValueLifecycleStage.ALPHA, parentType: ValueParentType.PART_OF },
    ],
  },
  {
    code: 'professional_services',
    name: 'Professional Services',
    type: ValueType.SERVICE,
    purpose: 'Expert consulting and implementation services',
    lifecycleStage: ValueLifecycleStage.STABLE,
    children: [
      { code: 'implementation_consulting', name: 'Implementation Consulting', type: ValueType.SERVICE, purpose: 'Platform onboarding and setup', lifecycleStage: ValueLifecycleStage.STABLE, parentType: ValueParentType.PART_OF },
      { code: 'training_program', name: 'Training Program', type: ValueType.SERVICE, purpose: 'Certification and skills development', lifecycleStage: ValueLifecycleStage.IDEA, parentType: ValueParentType.PART_OF },
      { code: 'managed_operations', name: 'Managed Operations', type: ValueType.SERVICE, purpose: '24/7 monitoring and incident management', lifecycleStage: ValueLifecycleStage.STABLE, parentType: ValueParentType.ON_TOP_OF },
    ],
  },
  {
    code: 'cloud_platform_license',
    name: 'Cloud Platform License',
    type: ValueType.RIGHT,
    purpose: 'Annual platform access license',
    lifecycleStage: ValueLifecycleStage.STABLE,
  },
  {
    code: 'strategic_partnership',
    name: 'Strategic Partnership',
    type: ValueType.RELATIONSHIP,
    purpose: 'Long-term co-development relationship',
    lifecycleStage: ValueLifecycleStage.ALPHA,
  },
  {
    code: 'usd',
    name: 'USD',
    type: ValueType.CURRENCY,
    purpose: 'Reserve currency for international transactions',
    lifecycleStage: ValueLifecycleStage.STABLE,
  },
  {
    code: 'eur',
    name: 'EUR',
    type: ValueType.CURRENCY,
    purpose: 'Eurozone currency',
    lifecycleStage: ValueLifecycleStage.STABLE,
  },
  {
    code: 'pln',
    name: 'PLN',
    type: ValueType.CURRENCY,
    purpose: 'Polish sovereign currency',
    lifecycleStage: ValueLifecycleStage.STABLE,
  },
  {
    code: 'btc',
    name: 'BTC',
    type: ValueType.CURRENCY,
    purpose: 'Peer-to-peer electronic cash system to enable secure, borderless transactions without intermediaries',
    lifecycleStage: ValueLifecycleStage.STABLE,
  },
  {
    code: 'gbp',
    name: 'GBP',
    type: ValueType.CURRENCY,
    purpose: 'Sterling, the currency of the United Kingdom',
    lifecycleStage: ValueLifecycleStage.STABLE,
  },
  {
    code: 'hour_of_consulting',
    name: 'Hour of consulting',
    type: ValueType.SERVICE,
    purpose: 'A single hour of expert consulting time',
    lifecycleStage: ValueLifecycleStage.STABLE,
  },
];

export async function seedValues(service: ValuesService, deps: ValueDeps) {
  const values: Array<{ id: string; name: string; type: ValueType }> = [];
  let idx = 0;

  for (const node of VALUE_TREE) {
    const taxonomy = deps.taxonomies.all[idx % deps.taxonomies.all.length];
    const agent = deps.agents[idx % deps.agents.length];
    const valueStream = deps.valueStreams.all[idx % deps.valueStreams.all.length];

    const parent = await service.create({
      code: node.code,
      name: node.name,
      type: node.type,
      purpose: node.purpose,
      description: faker.lorem.paragraph(),
      lifecycleStage: node.lifecycleStage,
      mainTaxonomyId: taxonomy.id,
      agentId: agent.id,
      valueStreamId: valueStream.id,
    });
    values.push({ id: parent.id, name: parent.name, type: node.type });
    idx++;

    if (node.children) {
      for (const child of node.children) {
        const childTaxonomy = deps.taxonomies.all[idx % deps.taxonomies.all.length];

        const created = await service.create({
          code: child.code,
          name: child.name,
          type: child.type,
          purpose: child.purpose,
          description: faker.lorem.paragraph(),
          lifecycleStage: child.lifecycleStage,
          mainTaxonomyId: childTaxonomy.id,
          agentId: agent.id,
          valueStreamId: valueStream.id,
          parentId: parent.id,
          parentType: child.parentType,
        });
        values.push({ id: created.id, name: created.name, type: child.type });
        idx++;
      }
    }
  }

  return values;
}
