import { z } from 'zod';

export const NBP_PLUGIN_ID = 'nbp';
export const NBP_RATE_SOURCE = 'NBP';
export const PLN_CODE = 'PLN';

/**
 * NBP plugin settings. Currencies to ingest are listed by ISO code; a code is
 * matched to a core currency Value with the same `code`, against the PLN Value.
 */
export const nbpSettingsSchema = z.object({
  enabled: z.boolean(),
  /** Cron expression for the (future) scheduled sync. */
  cron: z.string(),
  /** ISO codes to ingest, e.g. ["USD", "EUR"]. */
  trackedCurrencies: z.array(z.string()),
});

export type NbpSettings = z.infer<typeof nbpSettingsSchema>;

export const nbpSettingsDefaults: NbpSettings = {
  enabled: false,
  cron: '0 30 12 * * 1-5',
  trackedCurrencies: [],
};
