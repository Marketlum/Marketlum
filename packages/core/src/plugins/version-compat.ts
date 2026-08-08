// eslint-disable-next-line @typescript-eslint/no-require-imports
const corePackage = require('../../package.json') as { version: string };

/**
 * The @marketlum/core version that plugins declare compatibility against.
 * Read from package.json so it cannot drift from the released version.
 */
export const MARKETLUM_CORE_VERSION: string = corePackage.version;

function parse(version: string): [number, number, number] {
  const match = version.trim().replace(/^[v=]/, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : [0, 0, 0];
}

/**
 * Minimal semver range check supporting `^`, `~`, `>=`, exact and `*` — enough
 * for plugin manifest `marketlumCoreVersion` ranges without pulling in a semver
 * dependency.
 */
export function satisfiesCoreVersion(coreVersion: string, range: string): boolean {
  const r = range.trim();
  if (r === '' || r === '*' || r === 'x') return true;

  const [cMaj, cMin, cPat] = parse(coreVersion);

  if (r.startsWith('^')) {
    const [maj, min, pat] = parse(r.slice(1));
    if (maj > 0) return cMaj === maj && (cMin > min || (cMin === min && cPat >= pat));
    if (min > 0) return cMaj === 0 && cMin === min && cPat >= pat;
    return cMaj === 0 && cMin === 0 && cPat >= pat;
  }
  if (r.startsWith('~')) {
    const [maj, min, pat] = parse(r.slice(1));
    return cMaj === maj && cMin === min && cPat >= pat;
  }
  if (r.startsWith('>=')) {
    const [maj, min, pat] = parse(r.slice(2));
    return cMaj > maj || (cMaj === maj && (cMin > min || (cMin === min && cPat >= pat)));
  }

  const [maj, min, pat] = parse(r);
  return cMaj === maj && cMin === min && cPat === pat;
}
