'use client';

import { PluginRegistryProvider } from '@marketlum/ui';
import { webPlugins } from '../plugins';

/** Client boundary that feeds the web plugin registry to the app. Keeps the
 * (non-serializable) webPlugins array on the client side. */
export function Providers({ children }: { children: React.ReactNode }) {
  return <PluginRegistryProvider plugins={webPlugins}>{children}</PluginRegistryProvider>;
}
