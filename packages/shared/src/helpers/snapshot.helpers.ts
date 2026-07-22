export const IDENTITY_RATE = '1.0000000000';

export function isIdentityConversion(
  sourceCurrencyId: string | null | undefined,
  targetCurrencyId: string | null | undefined,
): boolean {
  return !!sourceCurrencyId && sourceCurrencyId === targetCurrencyId;
}
