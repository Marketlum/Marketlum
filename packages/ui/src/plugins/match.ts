import type { PluginRoute } from './types';

export interface PluginRouteMatch {
  route: PluginRoute;
  /** Values captured by `:param` segments in the route slug. Empty for exact matches. */
  params: Record<string, string>;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Resolves a catch-all slug (e.g. "platforms/123") against registered plugin
 * routes. Route slugs may contain `:param` segments ("platforms/:id"); an
 * exact-slug match always wins over a pattern match, otherwise the first
 * matching route in registration order is returned.
 */
export function matchPluginRoute(
  slug: string,
  routes: PluginRoute[],
): PluginRouteMatch | undefined {
  const exact = routes.find((r) => r.slug === slug);
  if (exact) return { route: exact, params: {} };

  const segments = slug.split('/');
  for (const route of routes) {
    if (!route.slug.includes(':')) continue;
    const pattern = route.slug.split('/');
    if (pattern.length !== segments.length) continue;
    const params: Record<string, string> = {};
    let matched = true;
    for (let i = 0; i < pattern.length; i += 1) {
      const part = pattern[i];
      if (part.length > 1 && part.startsWith(':')) {
        params[part.slice(1)] = decodeSegment(segments[i]);
      } else if (part !== segments[i]) {
        matched = false;
        break;
      }
    }
    if (matched) return { route, params };
  }
  return undefined;
}
