/**
 * Schema migration baseline — v1.
 *
 * v1 is the starting point for tilde's config schema. No data transformation
 * is required at this baseline version; `schemaVersion: 1` simply marks the
 * initial state of the schema.
 *
 * ## How to add a future migration (v1 → v2 example)
 *
 * ```ts
 * import { MIGRATIONS, type MigrationStep } from './runner.js';
 *
 * const v1ToV2: MigrationStep = (config) => ({
 *   ...config,
 *   newField: config['oldField'] ?? 'defaultValue',
 * });
 *
 * MIGRATIONS.set(1, v1ToV2);
 * ```
 *
 * Register all steps in this file, keyed by *source* version.
 * Import this module from `reader.ts` alongside `runner.ts` so the
 * registrations are executed before `runMigrations()` is called.
 */

// Re-export MigrationStep for convenience so callers don't need to import runner separately.
export type { MigrationStep } from './runner.js';

