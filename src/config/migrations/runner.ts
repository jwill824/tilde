/**
 * Config schema migration runner.
 *
 * Each migration step is a pure function that transforms a raw config record
 * from version N to version N+1. Register steps in the MIGRATIONS map keyed
 * by the *source* version string (e.g., key '1' = "migrate from v1 to next").
 *
 * The runner iterates applicable versions in ascending order, applying each
 * registered step in sequence. Missing steps (no-op versions) are skipped.
 *
 * Versions are compared as floating-point numbers (parseFloat).
 * Current version: '1.5'
 */

export type MigrationStep = (config: Record<string, unknown>) => Record<string, unknown>;

export interface MigrationResult {
  config: Record<string, unknown>;
  migratedFrom: string;
  migratedTo: string;
  didMigrate: boolean;
  isFutureVersion: boolean;
}

export const CURRENT_SCHEMA_VERSION = '1.6';

/**
 * Migration registry — keyed by *source* version string.
 * key '1' = "migrate from v1 (or earlier) to next version"
 * Add entries when new schema versions are introduced.
 */
export const MIGRATIONS: Map<string, MigrationStep> = new Map([
  // v1.5 → v1.6: packageManager (string) → packageManagers (array)
  ['1.5', (config) => {
    const pm = config['packageManager'];
    if (typeof pm === 'string' && !Array.isArray(config['packageManagers'])) {
      const { packageManager: _, ...rest } = config;
      return { ...rest, packageManagers: [pm] };
    }
    return config;
  }],
]);

/**
 * Run all applicable migration steps to bring `raw` up to `targetVersion`.
 *
 * - If `raw.schemaVersion` is absent, defaults to '1' (first version).
 * - If `raw.schemaVersion === targetVersion`, returns immediately (no mutation).
 * - If `raw.schemaVersion > targetVersion`, sets `isFutureVersion: true`.
 * - On step failure, the error propagates and the config is NOT modified on disk.
 */
export function runMigrations(
  raw: Record<string, unknown>,
  targetVersion: string = CURRENT_SCHEMA_VERSION,
): MigrationResult {
  const rawVersion = raw['schemaVersion'];
  const fromVersionStr = (rawVersion !== undefined && rawVersion !== null)
    ? String(rawVersion)
    : '1';

  if (fromVersionStr === targetVersion) {
    return {
      config: raw,
      migratedFrom: fromVersionStr,
      migratedTo: targetVersion,
      didMigrate: false,
      isFutureVersion: false,
    };
  }

  const fromFloat = parseFloat(fromVersionStr);
  const targetFloat = parseFloat(targetVersion);

  if (fromFloat > targetFloat) {
    return {
      config: raw,
      migratedFrom: fromVersionStr,
      migratedTo: targetVersion,
      didMigrate: false,
      isFutureVersion: true,
    };
  }

  // Find all applicable migration keys in ascending order
  const applicableKeys = Array.from(MIGRATIONS.keys())
    .map(k => ({ key: k, float: parseFloat(k) }))
    .filter(({ float }) => float >= fromFloat && float < targetFloat)
    .sort((a, b) => a.float - b.float);

  let current: Record<string, unknown> = { ...raw };

  for (const { key } of applicableKeys) {
    const step = MIGRATIONS.get(key);
    if (step) {
      current = step(current);
    }
  }

  // Stamp the target version
  current = { ...current, schemaVersion: targetVersion };

  return {
    config: current,
    migratedFrom: fromVersionStr,
    migratedTo: targetVersion,
    didMigrate: true,
    isFutureVersion: false,
  };
}
