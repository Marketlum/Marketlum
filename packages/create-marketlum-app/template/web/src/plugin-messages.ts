/**
 * Plugin i18n catalogs, keyed by plugin id. Plain data only (no React), safe to
 * import server-side in i18n/request.ts. Merged under `plugin.<id>.*`.
 * Add entries like `import { fooMessages } from '@marketlum/plugin-foo/web/messages';`
 */
export const pluginMessages: Record<string, Record<string, Record<string, unknown>>> = {};
