'use client';

import { createContext, useContext } from 'react';
import type { MarketlumWebPlugin, PluginRoute } from './types';
import { matchPluginRoute, type PluginRouteMatch } from './match';

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

/** Resolve a plugin page (with captured :param values) by its slug. */
export function usePluginRouteMatch(slug: string): PluginRouteMatch | undefined {
  const plugins = usePlugins();
  return matchPluginRoute(
    slug,
    plugins.flatMap((p) => p.routes ?? []),
  );
}

/** Resolve a plugin page by its slug (used by the /admin/x/[...slug] catch-all). */
export function usePluginRoute(slug: string): PluginRoute | undefined {
  return usePluginRouteMatch(slug)?.route;
}

/** Renders the plugin page matching a slug; shown by the catch-all route. */
export function PluginRouteRenderer({ slug }: { slug: string }) {
  const match = usePluginRouteMatch(slug);
  if (!match) {
    return <div className="p-6 text-sm text-muted-foreground">Not found</div>;
  }
  const Component = match.route.Component;
  return <Component params={match.params} />;
}
