import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ZodTypeAny } from 'zod';

/** A sidebar entry contributed by a plugin. Resolves to /admin/x/<slug>. */
export interface PluginNavItem {
  slug: string;
  /** next-intl key, namespaced under the plugin, e.g. 'plugin.nbp.nav.rates'. */
  labelKey: string;
  icon?: LucideIcon;
  /** Existing core group key ('home' | 'create' | 'exchange' | 'ledger' | 'system') or a new key. */
  group?: string;
  /** Required only when introducing a NEW group; the next-intl key for its heading. */
  groupLabelKey?: string;
}

/** A page contributed by a plugin, rendered by the /admin/x/[...slug] catch-all. */
export interface PluginRoute {
  slug: string;
  Component: ComponentType;
}

/**
 * The frontend half of a Marketlum plugin. Activated by listing it in the app's
 * `webPlugins` array (mirrors the backend `plugins` array). Because it carries
 * React components and icons it is consumed only on the client.
 */
export interface MarketlumWebPlugin {
  id: string;
  nav?: PluginNavItem[];
  routes?: PluginRoute[];
  /** Custom settings UI; when absent the schema-driven auto-form is used. */
  SettingsComponent?: ComponentType;
  /** Zod schema for the auto-generated settings form (ignored if SettingsComponent is set). */
  settingsSchema?: ZodTypeAny;
}
