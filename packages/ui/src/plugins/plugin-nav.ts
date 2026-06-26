import type { LucideIcon } from 'lucide-react';
import { Puzzle } from 'lucide-react';
import type { MarketlumWebPlugin } from './types';

export interface ResolvedNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface ResolvedNavGroup {
  key: string;
  label: string;
  items: ResolvedNavItem[];
}

/**
 * Merge plugin-contributed nav items into the core groups. A plugin item targets
 * an existing group by key, or introduces a new group (ordered after core ones).
 * Plugin groups with no key fall under a synthetic "plugins" group.
 */
export function mergePluginNav(
  coreGroups: ResolvedNavGroup[],
  plugins: MarketlumWebPlugin[],
  t: (key: string) => string,
): ResolvedNavGroup[] {
  const safeT = (key: string) => {
    try {
      return t(key);
    } catch {
      return key;
    }
  };

  const groups = coreGroups.map((g) => ({ ...g, items: [...g.items] }));
  const byKey = new Map(groups.map((g) => [g.key, g]));

  for (const plugin of plugins) {
    for (const item of plugin.nav ?? []) {
      const resolved: ResolvedNavItem = {
        href: `/admin/x/${item.slug}`,
        label: safeT(item.labelKey),
        icon: item.icon ?? Puzzle,
      };
      const groupKey = item.group ?? 'plugins';
      let group = byKey.get(groupKey);
      if (!group) {
        group = {
          key: groupKey,
          label: item.groupLabelKey ? safeT(item.groupLabelKey) : '',
          items: [],
        };
        byKey.set(groupKey, group);
        groups.push(group);
      }
      group.items.push(resolved);
    }
  }

  return groups;
}
