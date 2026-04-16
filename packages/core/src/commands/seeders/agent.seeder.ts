import { faker } from '@faker-js/faker';
import { AgentsService } from '../../agents/agents.service';
import { AgentType } from '@marketlum/shared';

interface AgentDeps {
  taxonomies: { all: Array<{ id: string }> };
}

const AGENTS = [
  { name: 'Acme Corp', type: AgentType.ORGANIZATION, purpose: 'Global manufacturing and distribution' },
  { name: 'TechNova Solutions', type: AgentType.ORGANIZATION, purpose: 'Cloud infrastructure provider' },
  { name: 'GreenLeaf Partners', type: AgentType.ORGANIZATION, purpose: 'Sustainable supply chain consulting' },
  { name: 'Sarah Palmer', type: AgentType.INDIVIDUAL, purpose: 'Independent market analyst' },
  { name: 'James Liu', type: AgentType.INDIVIDUAL, purpose: 'Freelance integration specialist' },
  { name: 'AutoFlow Bot', type: AgentType.VIRTUAL, purpose: 'Automated order processing agent' },
];

export async function seedAgents(service: AgentsService, deps: AgentDeps) {
  const agents: Array<{ id: string; name: string; type: AgentType }> = [];

  for (let i = 0; i < AGENTS.length; i++) {
    const agentData = AGENTS[i];
    const taxonomy = deps.taxonomies.all[i % deps.taxonomies.all.length];

    const agent = await service.create({
      name: agentData.name,
      type: agentData.type,
      purpose: agentData.purpose,
      mainTaxonomyId: taxonomy.id,
    });
    agents.push({ id: agent.id, name: agent.name, type: agentData.type });
  }

  return agents;
}
