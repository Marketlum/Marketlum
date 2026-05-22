import { ValueStreamsService } from '../../value-streams/value-streams.service';

interface ValueStreamDeps {
  users: Array<{ id: string }>;
}

const ROOT_STREAMS = [
  { code: 'general_company', name: 'General Company Stream', purpose: 'Make the world a cleaner place' },
];

const CHILD_STREAMS: Record<string, Array<{ code: string; name: string; purpose: string }>> = {
  general_company: [
    { code: 'batteries_manufacturing', name: 'Batteries Manufacturing', purpose: 'Green batteries for the blue planet' },
    { code: 'industrial_implementation', name: 'Industrial Implementation', purpose: 'Implementing green industrial processes' },
    { code: 'people', name: 'People', purpose: 'The right people for our purpose and organization' },
    { code: 'market_development', name: 'Market Development', purpose: 'Growing our market share and reach' },
    { code: 'licensing_ecosystem', name: 'Licensing Ecosystem', purpose: 'Expanding our licensing ecosystem and opportunities' },
    { code: 'backoffice_operations', name: 'Backoffice Operations', purpose: 'Support other value streams with accurate and timely back-office framework and services' },
  ],
};

export async function seedValueStreams(service: ValueStreamsService, deps: ValueStreamDeps) {
  const roots: Array<{ id: string; name: string; code: string }> = [];
  const children: Array<{ id: string; name: string; code: string }> = [];

  for (let i = 0; i < ROOT_STREAMS.length; i++) {
    const data = ROOT_STREAMS[i];
    const user = deps.users[i % deps.users.length];

    const stream = await service.create({
      code: data.code,
      name: data.name,
      purpose: data.purpose,
      leadUserId: user.id,
    });
    roots.push({ id: stream.id, name: stream.name, code: data.code });

    for (const childData of CHILD_STREAMS[data.code]) {
      const child = await service.create({
        code: childData.code,
        name: childData.name,
        purpose: childData.purpose,
        parentId: stream.id,
        leadUserId: deps.users[(i + 1) % deps.users.length].id,
      });
      children.push({ id: child.id, name: child.name, code: childData.code });
    }
  }

  return { roots, children, all: [...roots, ...children] };
}
