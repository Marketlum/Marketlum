import { toSnakeCase } from './snake-case';

describe('toSnakeCase', () => {
  it.each([
    ['Widget', 'widget'],
    ['EmcAgreement', 'emc_agreement'],
    ['MicroEnterprise', 'micro_enterprise'],
    ['ValueStream', 'value_stream'],
    ['HTTPServer', 'http_server'],
    ['APIKey', 'api_key'],
    ['already_snake', 'already_snake'],
    ['lowercase', 'lowercase'],
  ])('converts %s to %s', (input, expected) => {
    expect(toSnakeCase(input)).toBe(expected);
  });
});
