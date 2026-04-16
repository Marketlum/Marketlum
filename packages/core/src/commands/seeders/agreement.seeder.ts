import { faker } from '@faker-js/faker';
import { AgreementsService } from '../../agreements/agreements.service';

interface AgreementDeps {
  agents: Array<{ id: string; name: string }>;
  agreementTemplates: Array<{ id: string }>;
}

const AGREEMENTS = [
  { title: 'Acme Corp — TechNova MSA' },
  { title: 'GreenLeaf — Acme Consulting Agreement' },
  { title: 'TechNova — GreenLeaf NDA' },
  { title: 'Platform Partnership Framework' },
];

export async function seedAgreements(service: AgreementsService, deps: AgreementDeps) {
  const agreements: Array<{ id: string; title: string }> = [];

  for (let i = 0; i < AGREEMENTS.length; i++) {
    const data = AGREEMENTS[i];
    const partyA = deps.agents[i % deps.agents.length];
    const partyB = deps.agents[(i + 1) % deps.agents.length];
    const template = deps.agreementTemplates[i % deps.agreementTemplates.length];

    const agreement = await service.create({
      title: data.title,
      content: faker.lorem.paragraphs(2),
      partyIds: [partyA.id, partyB.id],
      agreementTemplateId: template.id,
    });
    agreements.push({ id: agreement.id, title: agreement.title });
  }

  return agreements;
}
