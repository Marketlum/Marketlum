import { faker } from '@faker-js/faker';
import { AgreementsService } from '../../agreements/agreements.service';

interface AgreementDeps {
  agents: Array<{ id: string; name: string }>;
  agreementTemplates: Array<{ id: string }>;
  valueStreams?: Array<{ id: string; name: string }>;
}

const AGREEMENTS = [
  { title: 'Acme Corp — TechNova MSA' },
  { title: 'GreenLeaf — Acme Consulting Agreement' },
  { title: 'TechNova — GreenLeaf NDA' },
  { title: 'Platform Partnership Framework' },
];

export async function seedAgreements(service: AgreementsService, deps: AgreementDeps) {
  const agreements: Array<{ id: string; title: string }> = [];
  const streams = deps.valueStreams ?? [];

  for (let i = 0; i < AGREEMENTS.length; i++) {
    const data = AGREEMENTS[i];
    const partyA = deps.agents[i % deps.agents.length];
    const partyB = deps.agents[(i + 1) % deps.agents.length];
    const template = deps.agreementTemplates[i % deps.agreementTemplates.length];

    // ~70% of agreements get a valueStreamId; distributed round-robin.
    const valueStreamId =
      streams.length > 0 && Math.random() < 0.7
        ? streams[i % streams.length].id
        : undefined;

    const agreement = await service.create({
      title: data.title,
      content: faker.lorem.paragraphs(2),
      partyIds: [partyA.id, partyB.id],
      agreementTemplateId: template.id,
      ...(valueStreamId ? { valueStreamId } : {}),
    });
    agreements.push({ id: agreement.id, title: agreement.title });
  }

  return agreements;
}
