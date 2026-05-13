import { faker } from '@faker-js/faker';
import { ValuesService } from '../../values/values.service';
import { ValueType, ValueLifecycleStage, ValueParentType } from '@marketlum/shared';

interface ValueDeps {
  taxonomies: { all: Array<{ id: string }> };
  agents: Array<{ id: string }>;
  valueStreams: { all: Array<{ id: string }> };
}

interface ValueNode {
  name: string;
  type: ValueType;
  purpose: string;
  lifecycleStage: ValueLifecycleStage;
  children?: Array<ValueNode & { parentType: ValueParentType }>;
}

const VALUE_TREE: ValueNode[] = [
  {
    name: 'Cloud Platform',
    type: ValueType.PRODUCT,
    purpose: 'Core cloud infrastructure platform',
    lifecycleStage: ValueLifecycleStage.STABLE,
    children: [
      { name: 'Compute Engine', type: ValueType.PRODUCT, purpose: 'Virtual machine provisioning and management', lifecycleStage: ValueLifecycleStage.STABLE, parentType: ValueParentType.PART_OF },
      { name: 'Object Storage', type: ValueType.PRODUCT, purpose: 'Scalable blob and file storage', lifecycleStage: ValueLifecycleStage.STABLE, parentType: ValueParentType.PART_OF },
      { name: 'Data Analytics Suite', type: ValueType.PRODUCT, purpose: 'Business intelligence and analytics toolset', lifecycleStage: ValueLifecycleStage.BETA, parentType: ValueParentType.ON_TOP_OF },
    ],
  },
  {
    name: 'Integration Middleware',
    type: ValueType.PRODUCT,
    purpose: 'API gateway and integration layer',
    lifecycleStage: ValueLifecycleStage.STABLE,
    children: [
      { name: 'API Access Token', type: ValueType.RIGHT, purpose: 'Programmatic access to platform APIs', lifecycleStage: ValueLifecycleStage.STABLE, parentType: ValueParentType.PART_OF },
      { name: 'Webhook Service', type: ValueType.SERVICE, purpose: 'Event-driven integration via webhooks', lifecycleStage: ValueLifecycleStage.ALPHA, parentType: ValueParentType.PART_OF },
    ],
  },
  {
    name: 'Professional Services',
    type: ValueType.SERVICE,
    purpose: 'Expert consulting and implementation services',
    lifecycleStage: ValueLifecycleStage.STABLE,
    children: [
      { name: 'Implementation Consulting', type: ValueType.SERVICE, purpose: 'Platform onboarding and setup', lifecycleStage: ValueLifecycleStage.STABLE, parentType: ValueParentType.PART_OF },
      { name: 'Training Program', type: ValueType.SERVICE, purpose: 'Certification and skills development', lifecycleStage: ValueLifecycleStage.IDEA, parentType: ValueParentType.PART_OF },
      { name: 'Managed Operations', type: ValueType.SERVICE, purpose: '24/7 monitoring and incident management', lifecycleStage: ValueLifecycleStage.STABLE, parentType: ValueParentType.ON_TOP_OF },
    ],
  },
  {
    name: 'Cloud Platform License',
    type: ValueType.RIGHT,
    purpose: 'Annual platform access license',
    lifecycleStage: ValueLifecycleStage.STABLE,
  },
  {
    name: 'Strategic Partnership',
    type: ValueType.RELATIONSHIP,
    purpose: 'Long-term co-development relationship',
    lifecycleStage: ValueLifecycleStage.ALPHA,
  },
  {
    name: 'USD',
    type: ValueType.PRODUCT,
    purpose: 'Reserve currency for international transactions',
    lifecycleStage: ValueLifecycleStage.STABLE,
  },
  {
    name: 'EUR',
    type: ValueType.PRODUCT,
    purpose: 'Eurozone currency',
    lifecycleStage: ValueLifecycleStage.STABLE,
  },
  {
    name: 'PLN',
    type: ValueType.PRODUCT,
    purpose: 'Polish sovereign currency',
    lifecycleStage: ValueLifecycleStage.STABLE,
  },
  {
    name: 'BTC',
    type: ValueType.PRODUCT,
    purpose: 'Peer-to-peer electronic cash system to enable secure, borderless transactions without intermediaries',
    lifecycleStage: ValueLifecycleStage.STABLE,
  },
  {
    name: 'GBP',
    type: ValueType.PRODUCT,
    purpose: 'Sterling, the currency of the United Kingdom',
    lifecycleStage: ValueLifecycleStage.STABLE,
  },
  {
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
