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
 * Versions are compared as major.minor tuples.
 * Current version: '1.7'
 */

import {
  compareSchemaVersions,
  isSchemaVersionGreater,
  parseSchemaVersion,
} from '../schema-version.js';

export type MigrationStep = (config: Record<string, unknown>) => Record<string, unknown>;

export interface MigrationResult {
  config: Record<string, unknown>;
  migratedFrom: string;
  migratedTo: string;
  didMigrate: boolean;
  isFutureVersion: boolean;
}

export const CURRENT_SCHEMA_VERSION = '1.7';

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
      const rest = Object.fromEntries(
        Object.entries(config).filter(([k]) => k !== 'packageManager')
      );
      return { ...rest, packageManagers: [pm] };
    }
    return config;
  }],
]);

/**
 * Run all applicable migration steps to bring `raw` up to `targetVersion`.
 *
 * - If `raw.schemaVersion` is absent or malformed, throws.
 * - If `raw.schemaVersion === targetVersion`, returns immediately (no mutation).
 * - If `raw.schemaVersion > targetVersion`, sets `isFutureVersion: true`.
 * - On step failure, the error propagates and the config is NOT modified on disk.
 */
export function runMigrations(
  raw: Record<string, unknown>,
  targetVersion: string = CURRENT_SCHEMA_VERSION,
): MigrationResult {
  const rawVersion = raw['schemaVersion'];
  const fromVersion = parseSchemaVersion(rawVersion);
  const target = parseSchemaVersion(targetVersion, 'target schemaVersion');
  const fromVersionStr = fromVersion.raw;

  if (compareSchemaVersions(fromVersion, target) === 0) {
    return {
      config: raw,
      migratedFrom: fromVersionStr,
      migratedTo: targetVersion,
      didMigrate: false,
      isFutureVersion: false,
    };
  }

  if (isSchemaVersionGreater(fromVersionStr, targetVersion)) {
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
    .map(key => ({ key, version: parseSchemaVersion(key, `migration key ${key}`) }))
    .filter(({ version }) => (
      compareSchemaVersions(version, fromVersion) >= 0 &&
      compareSchemaVersions(version, target) < 0
    ))
    .sort((a, b) => compareSchemaVersions(a.version, b.version));

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
