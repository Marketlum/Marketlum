import { faker } from '@faker-js/faker';
import { ValueStreamsService } from '../../value-streams/value-streams.service';

interface ValueStreamDeps {
  users: Array<{ id: string }>;
}

const ROOT_STREAMS = [
  { name: 'General Company Stream', purpose: 'Make the world a cleaner place' }
];

const CHILD_STREAMS: Record<string, Array<{ name: string; purpose: string }>> = {
  'General Company Stream': [
    { name: 'Batteries Manufacturing', purpose: 'Green batteries for the blue planet' },
    { name: 'Industrial Implementation', purpose: 'Implementing green industrial processes' },
    { name: 'People', purpose: 'The right people for our purpose and organization' },
    { name: 'Market Development', purpose: 'Growing our market share and reach' },
    { name: 'Licensing Ecosystem', purpose: 'Expanding our licensing ecosystem and opportunities' },
    { name: 'Backoffice Operations', purpose: 'Support other value streams with accurate and timely back-office framework and services' },
  ],
};

export async function seedValueStreams(service: ValueStreamsService, deps: ValueStreamDeps) {
  const roots: Array<{ id: string; name: string }> = [];
  const children: Array<{ id: string; name: string }> = [];

  for (let i = 0; i < ROOT_STREAMS.length; i++) {
    const data = ROOT_STREAMS[i];
    const user = deps.users[i % deps.users.length];

    const stream = await service.create({
      name: data.name,
      purpose: data.purpose,
      leadUserId: user.id,
    });
    roots.push({ id: stream.id, name: stream.name });

    for (const childData of CHILD_STREAMS[data.name]) {
      const child = await service.create({
        name: childData.name,
        purpose: childData.purpose,
        parentId: stream.id,
        leadUserId: deps.users[(i + 1) % deps.users.length].id,
      });
      children.push({ id: child.id, name: child.name });
    }
  }

  return { roots, children, all: [...roots, ...children] };
}
