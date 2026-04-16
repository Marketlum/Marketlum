import { faker } from '@faker-js/faker';
import { AgreementTemplatesService } from '../../agreement-templates/agreement-templates.service';
import { AgreementTemplateType } from '@marketlum/shared';

const TEMPLATES = [
  { name: 'Master Service Agreement', type: AgreementTemplateType.MAIN_AGREEMENT, purpose: 'Standard MSA for service engagements' },
  { name: 'Non-Disclosure Agreement', type: AgreementTemplateType.MAIN_AGREEMENT, purpose: 'Mutual NDA for business discussions' },
  { name: 'Service Level Schedule', type: AgreementTemplateType.SCHEDULE, purpose: 'SLA terms and uptime commitments' },
  { name: 'Data Processing Annex', type: AgreementTemplateType.ANNEX, purpose: 'GDPR-compliant data processing terms' },
];

export async function seedAgreementTemplates(service: AgreementTemplatesService) {
  const templates: Array<{ id: string; name: string }> = [];

  for (const data of TEMPLATES) {
    const template = await service.create({
      name: data.name,
      type: data.type,
      purpose: data.purpose,
      description: faker.lorem.paragraph(),
    });
    templates.push({ id: template.id, name: template.name });
  }

  return templates;
}
