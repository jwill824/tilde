import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fromZodError } from 'zod-validation-error';
import { TildeConfigSchema, type TildeConfig } from './schema.js';
import { runMigrations, CURRENT_SCHEMA_VERSION, type MigrationResult } from './migrations/runner.js';
import './migrations/v1-5.js';  // register v1→v1.5 migration
import { atomicWriteConfig } from './writer.js';

function expandTilde(p: string): string {
  if (p.startsWith('~/')) {
    return join(homedir(), p.slice(2));
  }
  return p;
}

export async function loadConfig(
  pathOrUrl: string,
  onMigrated?: (result: MigrationResult) => void,
): Promise<TildeConfig> {
  let content: string;

  if (pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('http://')) {
    const response = await fetch(pathOrUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch config from ${pathOrUrl}: ${response.statusText}`);
    }
    content = await response.text();
  } else {
    const expanded = expandTilde(pathOrUrl);
    content = await readFile(expanded, 'utf-8');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (e) {
    throw new Error(`Failed to parse config as JSON: ${(e as Error).message}`, { cause: e });
  }

  // Run migration before validation
  const rawRecord = (typeof raw === 'object' && raw !== null) ? raw as Record<string, unknown> : {};
  let migrationResult: MigrationResult;
  try {
    migrationResult = runMigrations(rawRecord, CURRENT_SCHEMA_VERSION);
  } catch (err) {
    throw new Error(
      `Config migration failed: ${(err as Error).message}. The original config file has not been modified.`,
      { cause: err }
    );
  }

  if (migrationResult.isFutureVersion) {
    console.warn(
      `[tilde] Warning: config schemaVersion (${rawRecord['schemaVersion']}) is newer than ` +
      `this version of tilde (CURRENT_SCHEMA_VERSION=${CURRENT_SCHEMA_VERSION}). ` +
      `Proceeding in read-only mode — config will not be rewritten.`
    );
  }

  if (migrationResult.didMigrate && !pathOrUrl.startsWith('http')) {
    const { join: pathJoin } = await import('node:path');
    const expandedPath = pathOrUrl.startsWith('~/') ? pathJoin(homedir(), pathOrUrl.slice(2)) : pathOrUrl;
    const migratedContent = JSON.stringify(migrationResult.config, null, 2) + '\n';
    await atomicWriteConfig(expandedPath, migratedContent);
    onMigrated?.(migrationResult);
  }

  const result = TildeConfigSchema.safeParse(migrationResult.config);
  if (!result.success) {
    const validationError = fromZodError(result.error);
    throw new Error(`Config validation failed:\n${validationError.message}`);
  }

  return result.data;
}
