import { faker } from '@faker-js/faker';
import { AgreementTemplatesService } from '../../agreement-templates/agreement-templates.service';
import { AgreementTemplateType } from '@marketlum/shared';

const TEMPLATES = [
  { code: 'msa_standard', name: 'Master Service Agreement', type: AgreementTemplateType.MAIN_AGREEMENT, purpose: 'Standard MSA for service engagements' },
  { code: 'nda_mutual', name: 'Non-Disclosure Agreement', type: AgreementTemplateType.MAIN_AGREEMENT, purpose: 'Mutual NDA for business discussions' },
  { code: 'sla_schedule', name: 'Service Level Schedule', type: AgreementTemplateType.SCHEDULE, purpose: 'SLA terms and uptime commitments' },
  { code: 'dpa_annex', name: 'Data Processing Annex', type: AgreementTemplateType.ANNEX, purpose: 'GDPR-compliant data processing terms' },
];

export async function seedAgreementTemplates(service: AgreementTemplatesService) {
  const templates: Array<{ id: string; name: string }> = [];

  for (const data of TEMPLATES) {
    const template = await service.create({
      code: data.code,
      name: data.name,
      type: data.type,
      purpose: data.purpose,
      description: faker.lorem.paragraph(),
    });
    templates.push({ id: template.id, name: template.name });
  }

  return templates;
}
