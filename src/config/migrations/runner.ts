/**
 * Config schema migration runner.
 *
 * Each migration step is a pure function that transforms a raw config record
 * from version N to version N+1. Register steps in the MIGRATIONS map keyed
 * by the *source* version (e.g., key 1 = "migrate from v1 to v2").
 *
 * The runner iterates keys in ascending numeric order, applying each registered
 * step in sequence. Missing steps (no-op versions) are skipped.
 */

export type MigrationStep = (config: Record<string, unknown>) => Record<string, unknown>;

export interface MigrationResult {
  config: Record<string, unknown>;
  migratedFrom: number;
  migratedTo: number;
  didMigrate: boolean;
  isFutureVersion: boolean;
}

export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Migration registry — keyed by *source* version.
 * Currently empty: v1 is the baseline. Add entries here when new schema
 * versions are introduced (e.g., MIGRATIONS.set(1, v1ToV2)).
 */
const MIGRATIONS: Map<number, MigrationStep> = new Map();

/**
 * Run all applicable migration steps to bring `raw` up to `targetVersion`.
 *
 * - If `raw.schemaVersion` is absent, defaults to 1 (FR-020).
 * - If `raw.schemaVersion === targetVersion`, returns immediately (no mutation).
 * - If `raw.schemaVersion > targetVersion`, sets `isFutureVersion: true` (FR-018).
 * - On step failure, the error propagates and the config is NOT modified on disk.
 */
export function runMigrations(
  raw: Record<string, unknown>,
  targetVersion: number = CURRENT_SCHEMA_VERSION,
): MigrationResult {
  const fromVersion =
    typeof raw['schemaVersion'] === 'number' ? raw['schemaVersion'] : 1;

  if (fromVersion === targetVersion) {
    return {
      config: raw,
      migratedFrom: fromVersion,
      migratedTo: targetVersion,
      didMigrate: false,
      isFutureVersion: false,
    };
  }

  if (fromVersion > targetVersion) {
    return {
      config: raw,
      migratedFrom: fromVersion,
      migratedTo: targetVersion,
      didMigrate: false,
      isFutureVersion: true,
    };
  }

  // Apply migration steps in ascending order
  let current: Record<string, unknown> = { ...raw };

  for (let v = fromVersion; v < targetVersion; v++) {
    const step = MIGRATIONS.get(v);
    if (step) {
      current = step(current);
    }
    current = { ...current, schemaVersion: v + 1 };
  }

  return {
    config: current,
    migratedFrom: fromVersion,
    migratedTo: targetVersion,
    didMigrate: true,
    isFutureVersion: false,
  };
}
