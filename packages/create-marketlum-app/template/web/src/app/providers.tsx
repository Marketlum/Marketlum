'use client';

import { PluginRegistryProvider } from '@marketlum/ui';
import { webPlugins } from '../plugins';

/** Client boundary that feeds the web plugin registry to the app. */
export function Providers({ children }: { children: React.ReactNode }) {
  return <PluginRegistryProvider plugins={webPlugins}>{children}</PluginRegistryProvider>;
}
