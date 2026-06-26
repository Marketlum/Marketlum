import { PluginRouteRenderer } from '@marketlum/ui';

/** Catch-all route for plugin pages: /admin/x/<slug> resolves to a plugin's
 * registered route Component via the client registry. */
export default async function PluginCatchAllPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return <PluginRouteRenderer slug={slug.join('/')} />;
}
