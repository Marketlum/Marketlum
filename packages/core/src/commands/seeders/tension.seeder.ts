import { faker } from '@faker-js/faker';
import { TensionsService } from '../../tensions/tensions.service';

interface TensionDeps {
  agents: Array<{ id: string }>;
  users: Array<{ id: string }>;
}

const TENSIONS = [
  { name: 'Slow onboarding cycle', currentContext: 'New customers take 6+ weeks to go live', potentialFuture: 'Automated onboarding reduces time to 1 week', score: 8 },
  { name: 'Manual invoice reconciliation', currentContext: 'Finance team spends 20 hours/week on manual matching', potentialFuture: 'Automated reconciliation with 99% accuracy', score: 7 },
  { name: 'Limited partner visibility', currentContext: 'No real-time insight into partner pipeline', potentialFuture: 'Shared dashboard with live deal tracking', score: 6 },
  { name: 'Data silos across teams', currentContext: 'Sales and product teams use separate tools with no integration', potentialFuture: 'Unified data platform with cross-team visibility', score: 9 },
  { name: 'Inconsistent pricing', currentContext: 'Regional teams apply different pricing rules', potentialFuture: 'Central pricing engine with regional overrides', score: 5 },
];

export async function seedTensions(service: TensionsService, deps: TensionDeps) {
  const tensions: Array<{ id: string; name: string }> = [];

  for (let i = 0; i < TENSIONS.length; i++) {
    const data = TENSIONS[i];
    const agent = deps.agents[i % deps.agents.length];
    const user = deps.users[i % deps.users.length];

    const tension = await service.create({
      name: data.name,
      currentContext: data.currentContext,
      potentialFuture: data.potentialFuture,
      score: data.score,
      agentId: agent.id,
      leadUserId: user.id,
    });
    tensions.push({ id: tension.id, name: tension.name });
  }

  return tensions;
}
