/**
 * Plugin-owned i18n catalogs. Plain data (no React) so they can be merged into
 * the host app's next-intl dictionary server-side under `plugin.nbp.*`.
 */
export const nbpMessages = {
  en: {
    nav: { rates: 'NBP Rates' },
    settings: {
      title: 'NBP exchange rates',
      enabled: 'Automatic sync enabled',
      cron: 'Schedule (cron expression)',
      tracked: 'Tracked currencies (ISO codes, comma-separated)',
      save: 'Save',
      saved: 'Settings saved',
      refresh: 'Refresh now',
      lastRun: 'Last run: updated {updated}, skipped {skipped}, errors {errors}',
      failed: 'Request failed',
    },
  },
  pl: {
    nav: { rates: 'Kursy NBP' },
    settings: {
      title: 'Kursy wymiany NBP',
      enabled: 'Automatyczna synchronizacja włączona',
      cron: 'Harmonogram (wyrażenie cron)',
      tracked: 'Śledzone waluty (kody ISO, oddzielone przecinkami)',
      save: 'Zapisz',
      saved: 'Ustawienia zapisane',
      refresh: 'Odśwież teraz',
      lastRun: 'Ostatnie uruchomienie: zaktualizowano {updated}, pominięto {skipped}, błędy {errors}',
      failed: 'Żądanie nie powiodło się',
    },
  },
};
