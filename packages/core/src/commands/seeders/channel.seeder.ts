import { ChannelsService } from '../../channels/channels.service';

interface ChannelDeps {
  agents: Array<{ id: string }>;
}

const ROOT_CHANNELS = [
  { code: 'direct_sales', name: 'Direct Sales', color: '#2563eb', purpose: 'Face-to-face and direct outreach' },
  { code: 'online', name: 'Online', color: '#16a34a', purpose: 'Digital channels and e-commerce' },
  { code: 'partner_network', name: 'Partner Network', color: '#d97706', purpose: 'Resellers and distribution partners' },
  { code: 'marketplace', name: 'Marketplace', color: '#9333ea', purpose: 'Third-party marketplace platforms' },
];

const CHILD_CHANNELS: Record<string, Array<{ code: string; name: string; color: string }>> = {
  direct_sales: [{ code: 'direct_sales_field', name: 'Field Sales', color: '#3b82f6' }],
  online: [{ code: 'online_website', name: 'Website', color: '#22c55e' }],
  partner_network: [{ code: 'partner_var', name: 'VAR Channel', color: '#f59e0b' }],
  marketplace: [{ code: 'marketplace_aws', name: 'AWS Marketplace', color: '#a855f7' }],
};

export async function seedChannels(service: ChannelsService, deps: ChannelDeps) {
  const roots: Array<{ id: string; name: string }> = [];
  const children: Array<{ id: string; name: string }> = [];

  for (let i = 0; i < ROOT_CHANNELS.length; i++) {
    const channelData = ROOT_CHANNELS[i];
    const agent = deps.agents[i % deps.agents.length];

    const channel = await service.create({
      code: channelData.code,
      name: channelData.name,
      purpose: channelData.purpose,
      color: channelData.color,
      agentId: agent.id,
    });
    roots.push({ id: channel.id, name: channel.name });

    for (const childData of CHILD_CHANNELS[channelData.code]) {
      const child = await service.create({
        code: childData.code,
        name: childData.name,
        color: childData.color,
        parentId: channel.id,
      });
      children.push({ id: child.id, name: child.name });
    }
  }

  return { roots, children, all: [...roots, ...children] };
}
