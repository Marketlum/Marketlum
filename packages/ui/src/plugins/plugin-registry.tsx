'use client';

import { createContext, useContext } from 'react';
import type { MarketlumWebPlugin, PluginRoute } from './types';

const PluginRegistryContext = createContext<MarketlumWebPlugin[]>([]);

export function PluginRegistryProvider({
  plugins,
  children,
}: {
  plugins: MarketlumWebPlugin[];
  children: React.ReactNode;
}) {
  return (
    <PluginRegistryContext.Provider value={plugins}>{children}</PluginRegistryContext.Provider>
  );
}

/** All active web plugins. Returns [] when no provider is present. */
export function usePlugins(): MarketlumWebPlugin[] {
  return useContext(PluginRegistryContext);
}

/** Resolve a plugin page by its slug (used by the /admin/x/[...slug] catch-all). */
export function usePluginRoute(slug: string): PluginRoute | undefined {
  const plugins = usePlugins();
  for (const plugin of plugins) {
    const route = plugin.routes?.find((r) => r.slug === slug);
    if (route) return route;
  }
  return undefined;
}

/** Renders the plugin page matching a slug; shown by the catch-all route. */
export function PluginRouteRenderer({ slug }: { slug: string }) {
  const route = usePluginRoute(slug);
  if (!route) {
    return <div className="p-6 text-sm text-muted-foreground">Not found</div>;
  }
  const Component = route.Component;
  return <Component />;
}
