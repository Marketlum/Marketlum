import { faker } from '@faker-js/faker';
import { ChannelsService } from '../../channels/channels.service';

interface ChannelDeps {
  agents: Array<{ id: string }>;
}

const ROOT_CHANNELS = [
  { name: 'Direct Sales', color: '#2563eb', purpose: 'Face-to-face and direct outreach' },
  { name: 'Online', color: '#16a34a', purpose: 'Digital channels and e-commerce' },
  { name: 'Partner Network', color: '#d97706', purpose: 'Resellers and distribution partners' },
  { name: 'Marketplace', color: '#9333ea', purpose: 'Third-party marketplace platforms' },
];

const CHILD_CHANNELS: Record<string, Array<{ name: string; color: string }>> = {
  'Direct Sales': [{ name: 'Field Sales', color: '#3b82f6' }],
  'Online': [{ name: 'Website', color: '#22c55e' }],
  'Partner Network': [{ name: 'VAR Channel', color: '#f59e0b' }],
  'Marketplace': [{ name: 'AWS Marketplace', color: '#a855f7' }],
};

export async function seedChannels(service: ChannelsService, deps: ChannelDeps) {
  const roots: Array<{ id: string; name: string }> = [];
  const children: Array<{ id: string; name: string }> = [];

  for (let i = 0; i < ROOT_CHANNELS.length; i++) {
    const channelData = ROOT_CHANNELS[i];
    const agent = deps.agents[i % deps.agents.length];

    const channel = await service.create({
      name: channelData.name,
      purpose: channelData.purpose,
      color: channelData.color,
      agentId: agent.id,
    });
    roots.push({ id: channel.id, name: channel.name });

    for (const childData of CHILD_CHANNELS[channelData.name]) {
      const child = await service.create({
        name: childData.name,
        color: childData.color,
        parentId: channel.id,
      });
      children.push({ id: child.id, name: child.name });
    }
  }

  return { roots, children, all: [...roots, ...children] };
}
