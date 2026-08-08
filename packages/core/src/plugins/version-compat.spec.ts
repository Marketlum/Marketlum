import { readFileSync } from 'fs';
import { join } from 'path';
import { MARKETLUM_CORE_VERSION, satisfiesCoreVersion } from './version-compat';

describe('MARKETLUM_CORE_VERSION', () => {
  it('matches the version in package.json', () => {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'),
    ) as { version: string };
    expect(MARKETLUM_CORE_VERSION).toBe(pkg.version);
  });
});

describe('satisfiesCoreVersion', () => {
  it.each(['*', 'x', '', '  '])('treats "%s" as matching anything', (range) => {
    expect(satisfiesCoreVersion('3.7.9', range)).toBe(true);
  });

  describe('caret ranges', () => {
    it.each([
      ['1.2.3', '^1.2.3', true],
      ['1.2.4', '^1.2.3', true],
      ['1.9.0', '^1.2.3', true],
      ['1.2.2', '^1.2.3', false],
      ['2.0.0', '^1.2.3', false],
      ['0.9.9', '^1.2.3', false],
    ])('%s vs %s -> %s', (version, range, expected) => {
      expect(satisfiesCoreVersion(version, range)).toBe(expected);
    });

    it.each([
      // With major 0, the minor acts as the breaking-change boundary.
      ['0.4.0', '^0.4.0', true],
      ['0.4.9', '^0.4.0', true],
      ['0.5.0', '^0.4.0', false],
      ['0.3.9', '^0.4.0', false],
      ['1.0.0', '^0.4.0', false],
      // With major and minor 0, every patch is potentially breaking upward-compatible.
      ['0.0.3', '^0.0.3', true],
      ['0.0.4', '^0.0.3', true],
      ['0.0.2', '^0.0.3', false],
      ['0.1.0', '^0.0.3', false],
    ])('0.x semantics: %s vs %s -> %s', (version, range, expected) => {
      expect(satisfiesCoreVersion(version, range)).toBe(expected);
    });
  });

  describe('tilde ranges', () => {
    it.each([
      ['1.2.3', '~1.2.3', true],
      ['1.2.9', '~1.2.3', true],
      ['1.2.2', '~1.2.3', false],
      ['1.3.0', '~1.2.3', false],
      ['2.2.3', '~1.2.3', false],
    ])('%s vs %s -> %s', (version, range, expected) => {
      expect(satisfiesCoreVersion(version, range)).toBe(expected);
    });
  });

  describe('>= ranges', () => {
    it.each([
      ['1.2.3', '>=1.2.3', true],
      ['1.2.4', '>=1.2.3', true],
      ['1.3.0', '>=1.2.3', true],
      ['2.0.0', '>=1.2.3', true],
      ['1.2.2', '>=1.2.3', false],
      ['0.9.9', '>=1.2.3', false],
    ])('%s vs %s -> %s', (version, range, expected) => {
      expect(satisfiesCoreVersion(version, range)).toBe(expected);
    });
  });

  describe('exact ranges', () => {
    it.each([
      ['1.2.3', '1.2.3', true],
      ['1.2.4', '1.2.3', false],
      ['1.3.3', '1.2.3', false],
    ])('%s vs %s -> %s', (version, range, expected) => {
      expect(satisfiesCoreVersion(version, range)).toBe(expected);
    });

    it('tolerates a leading v or = on the range', () => {
      expect(satisfiesCoreVersion('1.2.3', 'v1.2.3')).toBe(true);
      expect(satisfiesCoreVersion('1.2.3', '=1.2.3')).toBe(true);
    });

    it('tolerates surrounding whitespace', () => {
      expect(satisfiesCoreVersion('1.2.3', ' ^1.2.3 ')).toBe(true);
    });
  });

  it('parses an unparseable version as 0.0.0 rather than throwing', () => {
    expect(satisfiesCoreVersion('1.2.3', 'garbage')).toBe(false);
    expect(satisfiesCoreVersion('garbage', '1.2.3')).toBe(false);
    expect(satisfiesCoreVersion('garbage', '*')).toBe(true);
  });
});
