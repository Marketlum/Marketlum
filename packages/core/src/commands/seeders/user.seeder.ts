import { faker } from '@faker-js/faker';
import { UserType } from '@marketlum/shared';
import { UsersService } from '../../users/users.service';
import { RolesService } from '../../roles/roles.service';

const USERS = [
  { name: 'John Doe', email: 'admin@marketlum.com' },
  { name: 'Bob Smith', email: 'bob@marketlum.com' },
  { name: 'Carol Martinez', email: 'carol@marketlum.com' },
  { name: 'David Chen', email: 'david@marketlum.com' },
  { name: 'Eva Kowalski', email: 'eva@marketlum.com' },
];

export async function seedUsers(service: UsersService, rolesService: RolesService) {
  // A --reset truncates roles too, so the Admin role may need recreating.
  const adminRole = await rolesService.ensureAdminRole();

  const users: Array<{ id: string; name: string; email: string }> = [];

  for (const userData of USERS) {
    const user = await service.create({
      name: userData.name,
      email: userData.email,
      password: 'password123',
    });
    await service.assignRoles(user.id, [adminRole.id]);
    users.push({ id: user.id, name: user.name, email: user.email });
  }

  return users;
}

/**
 * Spec 025: one agent user operating as the seeded "Acme Pricing Agent" actor.
 * Runs after seedActors (the link needs the actor id). No API key is seeded —
 * plaintext keys in seed output would rot in docs; admins provision real ones.
 */
export async function seedAgentUser(
  service: UsersService,
  rolesService: RolesService,
  actors: Array<{ id: string; name: string }>,
) {
  const pricingActor = actors.find((a) => a.name === 'Acme Pricing Agent');

  const existingRole = await rolesService.findByCode('agent_reader');
  const role =
    existingRole ??
    (await rolesService.create({
      name: 'Agent Reader',
      code: 'agent_reader',
      parentId: null,
      permissions: ['actors:read', 'dashboard:read', 'search:read'],
    }));

  const agent = await service.create({
    name: 'Acme Pricing Agent',
    email: 'pricing-agent@acme.example',
    type: UserType.AGENT,
    actorId: pricingActor?.id ?? null,
  });
  await service.assignRoles(agent.id, [role.id]);
  return agent;
}
