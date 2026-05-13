export const EXCHANGE_RATE_PRECISION = 10;
export const BASE_AMOUNT_PRECISION = 2;

export interface CanonicalisedRate {
  fromValueId: string;
  toValueId: string;
  rate: string;
}

export function canonicaliseRate(input: CanonicalisedRate): CanonicalisedRate {
  if (input.fromValueId < input.toValueId) {
    return {
      fromValueId: input.fromValueId,
      toValueId: input.toValueId,
      rate: input.rate,
    };
  }
  return {
    fromValueId: input.toValueId,
    toValueId: input.fromValueId,
    rate: invertRate(input.rate),
  };
}

export function invertRate(rate: string): string {
  const n = Number(rate);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Cannot invert non-positive rate: ${rate}`);
  }
  return (1 / n).toFixed(EXCHANGE_RATE_PRECISION);
}

export function convertAmount(amount: string, rate: string): string {
  const product = Number(amount) * Number(rate);
  if (!Number.isFinite(product)) {
    throw new Error(`Conversion produced non-finite result: ${amount} × ${rate}`);
  }
  return product.toFixed(BASE_AMOUNT_PRECISION);
}

export function formatRate(rate: string): string {
  return Number(rate).toFixed(EXCHANGE_RATE_PRECISION);
}

export function formatBaseAmount(amount: string): string {
  return Number(amount).toFixed(BASE_AMOUNT_PRECISION);
}
