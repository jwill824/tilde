/**
 * Schema migration: v1 → v1.5
 *
 * Adds new fields introduced in schema version 1.5:
 * - `browser`: `{ selected: [], default: null }`
 * - `aiTools`: `[]`
 * - `editors`: if a string value exists, normalize to `{ primary: <value>, additional: [] }`
 * - `contexts[].languageBindings`: `[]` per context
 *
 * ## Registration
 *
 * This module registers a migration step keyed '1', meaning it runs when
 * migrating from schema version '1' (or equivalent) toward '1.5'.
 *
 * Import this module from `reader.ts` alongside `runner.ts` so that
 * the registration executes before `runMigrations()` is called.
 */

import { MIGRATIONS, type MigrationStep } from './runner.js';

const v1ToV1_5: MigrationStep = (config) => {
  const migrated: Record<string, unknown> = { ...config };

  // Add browser field if missing
  if (!migrated['browser']) {
    migrated['browser'] = { selected: [], default: null };
  }

  // Add aiTools field if missing
  if (!migrated['aiTools']) {
    migrated['aiTools'] = [];
  }

  // Normalize editors: if it's a string, convert to object form
  if (typeof migrated['editors'] === 'string') {
    migrated['editors'] = {
      primary: migrated['editors'],
      additional: [],
    };
  }

  // Add languageBindings to each context if missing
  if (Array.isArray(migrated['contexts'])) {
    migrated['contexts'] = (migrated['contexts'] as Record<string, unknown>[]).map((ctx) => {
      if (!ctx['languageBindings']) {
        return { ...ctx, languageBindings: [] };
      }
      return ctx;
    });
  }

  return migrated;
};

// Register the migration: key '1' means "source version is 1 (or '1')"
MIGRATIONS.set('1', v1ToV1_5);

// Re-export MigrationStep for convenience
export type { MigrationStep } from './runner.js';
