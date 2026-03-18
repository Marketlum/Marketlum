import { z } from 'zod';

export const SUPPORTED_LOCALE_CODES = [
  'af', 'af-ZA', 'am', 'am-ET', 'ar', 'ar-AE', 'ar-BH', 'ar-DZ', 'ar-EG',
  'ar-IQ', 'ar-JO', 'ar-KW', 'ar-LB', 'ar-LY', 'ar-MA', 'ar-OM', 'ar-QA',
  'ar-SA', 'ar-SY', 'ar-TN', 'ar-YE', 'az', 'az-AZ', 'be', 'be-BY', 'bg',
  'bg-BG', 'bn', 'bn-BD', 'bn-IN', 'bs', 'bs-BA', 'ca', 'ca-ES', 'cs',
  'cs-CZ', 'cy', 'cy-GB', 'da', 'da-DK', 'de', 'de-AT', 'de-CH', 'de-DE',
  'de-LI', 'de-LU', 'el', 'el-GR', 'en', 'en-AU', 'en-CA', 'en-GB',
  'en-IE', 'en-IN', 'en-NZ', 'en-SG', 'en-US', 'en-ZA', 'es', 'es-AR',
  'es-BO', 'es-CL', 'es-CO', 'es-CR', 'es-DO', 'es-EC', 'es-ES', 'es-GT',
  'es-HN', 'es-MX', 'es-NI', 'es-PA', 'es-PE', 'es-PR', 'es-PY', 'es-SV',
  'es-US', 'es-UY', 'es-VE', 'et', 'et-EE', 'eu', 'eu-ES', 'fa', 'fa-IR',
  'fi', 'fi-FI', 'fil', 'fil-PH', 'fr', 'fr-BE', 'fr-CA', 'fr-CH', 'fr-FR',
  'fr-LU', 'ga', 'ga-IE', 'gl', 'gl-ES', 'gu', 'gu-IN', 'he', 'he-IL',
  'hi', 'hi-IN', 'hr', 'hr-HR', 'hu', 'hu-HU', 'hy', 'hy-AM', 'id',
  'id-ID', 'is', 'is-IS', 'it', 'it-CH', 'it-IT', 'ja', 'ja-JP', 'ka',
  'ka-GE', 'kk', 'kk-KZ', 'km', 'km-KH', 'kn', 'kn-IN', 'ko', 'ko-KR',
  'lo', 'lo-LA', 'lt', 'lt-LT', 'lv', 'lv-LV', 'mk', 'mk-MK', 'ml',
  'ml-IN', 'mn', 'mn-MN', 'mr', 'mr-IN', 'ms', 'ms-MY', 'mt', 'mt-MT',
  'my', 'my-MM', 'nb', 'nb-NO', 'ne', 'ne-NP', 'nl', 'nl-BE', 'nl-NL',
  'nn', 'nn-NO', 'pa', 'pa-IN', 'pl', 'pl-PL', 'pt', 'pt-BR', 'pt-PT',
  'ro', 'ro-RO', 'ru', 'ru-RU', 'si', 'si-LK', 'sk', 'sk-SK', 'sl',
  'sl-SI', 'sq', 'sq-AL', 'sr', 'sr-RS', 'sv', 'sv-SE', 'sw', 'sw-KE',
  'ta', 'ta-IN', 'te', 'te-IN', 'th', 'th-TH', 'tr', 'tr-TR', 'uk',
  'uk-UA', 'ur', 'ur-PK', 'uz', 'uz-UZ', 'vi', 'vi-VN', 'zh', 'zh-CN',
  'zh-HK', 'zh-TW',
] as const;

export type SupportedLocaleCode = (typeof SUPPORTED_LOCALE_CODES)[number];

export const createLocaleSchema = z.object({
  code: z.enum(SUPPORTED_LOCALE_CODES),
});

export const localeResponseSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateLocaleInput = z.infer<typeof createLocaleSchema>;
export type LocaleResponse = z.infer<typeof localeResponseSchema>;
