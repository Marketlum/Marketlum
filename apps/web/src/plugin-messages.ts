import { nbpMessages } from '@marketlum/plugin-nbp/web/messages';
import { rdhyMessages } from '@marketlum/plugin-rdhy/web/messages';

/**
 * Plugin i18n catalogs, keyed by plugin id. Plain data only (no React), so it is
 * safe to import server-side in i18n/request.ts. Each entry is merged into the
 * dictionary under `plugin.<id>.*`.
 */
export const pluginMessages: Record<string, Record<string, Record<string, unknown>>> = {
  nbp: nbpMessages,
  rdhy: rdhyMessages,
};
