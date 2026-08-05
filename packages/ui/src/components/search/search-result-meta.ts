import { Gem, Bot, User, Layers, Workflow, Flame } from 'lucide-react';
import type { SearchResult } from '@marketlum/shared';

export const typeConfig: Record<
  SearchResult['type'],
  { icon: typeof Gem; variant: 'default' | 'secondary' | 'outline' }
> = {
  value: { icon: Gem, variant: 'default' },
  actor: { icon: Bot, variant: 'secondary' },
  user: { icon: User, variant: 'outline' },
  value_instance: { icon: Layers, variant: 'secondary' },
  value_stream: { icon: Workflow, variant: 'secondary' },
  tension: { icon: Flame, variant: 'default' },
};

export function resultHref(result: SearchResult): string {
  switch (result.type) {
    case 'value':
      return `/admin/values/${result.id}`;
    case 'actor':
      return `/admin/actors/${result.id}`;
    case 'user':
      return '/admin/users';
    case 'value_instance':
      return `/admin/value-instances/${result.id}`;
    case 'tension':
      return `/admin/tensions/${result.id}`;
    case 'value_stream':
      return '/admin/value-streams';
  }
}
