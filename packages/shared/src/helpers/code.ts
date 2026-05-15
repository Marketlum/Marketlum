import { CODE_PATTERN } from '../schemas/code.schema';

export function suggestCode(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return CODE_PATTERN.test(slug) ? slug : '';
}
