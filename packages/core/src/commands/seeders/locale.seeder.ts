import { LocalesService } from '../../locales/locales.service';
import { SupportedLocaleCode } from '@marketlum/shared';

const LOCALE_CODES: SupportedLocaleCode[] = ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'es-ES', 'pl-PL'];

export async function seedLocales(service: LocalesService) {
  const locales: Array<{ id: string; code: string }> = [];

  for (const code of LOCALE_CODES) {
    const locale = await service.create({ code });
    locales.push({ id: locale.id, code: locale.code });
  }

  return locales;
}
