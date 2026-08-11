import { formatAuditEntityType } from './format-audit-entity';

describe('formatAuditEntityType', () => {
  it.each([
    ['actor', 'actor'],
    ['system_setting', 'system_setting'],
    ['plugin.rdhy.rdhy_emc_agreement', 'rdhy · emc_agreement'],
    ['plugin.rdhy.rdhy_platform', 'rdhy · platform'],
    ['plugin.nbp.widget', 'nbp · widget'],
    ['plugin.my-ext.my_ext_widget', 'my-ext · widget'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatAuditEntityType(input)).toBe(expected);
  });
});
