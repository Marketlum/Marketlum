"use client"

// Map of language codes to country codes for locales without region
const languageToCountry: Record<string, string> = {
  en: 'GB',
  pl: 'PL',
  de: 'DE',
  fr: 'FR',
  es: 'ES',
  it: 'IT',
  pt: 'PT',
  nl: 'NL',
  ru: 'RU',
  ja: 'JP',
  ko: 'KR',
  zh: 'CN',
  ar: 'SA',
  hi: 'IN',
  tr: 'TR',
  sv: 'SE',
  da: 'DK',
  fi: 'FI',
  no: 'NO',
  cs: 'CZ',
  sk: 'SK',
  hu: 'HU',
  ro: 'RO',
  bg: 'BG',
  uk: 'UA',
  el: 'GR',
  he: 'IL',
  th: 'TH',
  vi: 'VN',
  id: 'ID',
  ms: 'MY',
}

function getCountryCode(localeCode: string): string | null {
  const parts = localeCode.split('-')

  // If we have a region code (e.g., en-US), use it
  if (parts.length >= 2 && parts[1].length === 2) {
    return parts[1].toUpperCase()
  }

  // Otherwise, try to map the language code to a default country
  const langCode = parts[0].toLowerCase()
  return languageToCountry[langCode] || null
}

function countryCodeToEmoji(countryCode: string): string {
  // Convert country code to regional indicator symbols
  // Each letter is converted to its corresponding regional indicator symbol
  // A = 🇦 (U+1F1E6), B = 🇧 (U+1F1E7), etc.
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))

  return String.fromCodePoint(...codePoints)
}

interface LocaleFlagProps {
  code: string
  className?: string
}

export function LocaleFlag({ code, className = "" }: LocaleFlagProps) {
  const countryCode = getCountryCode(code)

  if (!countryCode) {
    return <span className={`text-lg ${className}`}>🌐</span>
  }

  const flag = countryCodeToEmoji(countryCode)

  return <span className={`text-lg ${className}`}>{flag}</span>
}
