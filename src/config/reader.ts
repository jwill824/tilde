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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatFieldPath(parts: Array<string | number>): string {
  return parts.reduce<string>((path, part) => {
    if (typeof part === 'number') {
      return `${path}[${part}]`;
    }
    return path ? `${path}.${part}` : part;
  }, '');
}

function collectUnknownFieldsRecursive(
  raw: unknown,
  parsed: unknown,
  path: Array<string | number>,
  unknownFields: string[],
): void {
  if (Array.isArray(raw) && Array.isArray(parsed)) {
    raw.forEach((item, index) => {
      collectUnknownFieldsRecursive(item, parsed[index], [...path, index], unknownFields);
    });
    return;
  }

  if (!isRecord(raw) || !isRecord(parsed)) {
    return;
  }

  for (const [key, value] of Object.entries(raw)) {
    if (!Object.prototype.hasOwnProperty.call(parsed, key)) {
      unknownFields.push(formatFieldPath([...path, key]));
      continue;
    }

    collectUnknownFieldsRecursive(value, parsed[key], [...path, key], unknownFields);
  }
}

export function collectUnknownConfigFields(
  raw: Record<string, unknown>,
  parsed: Record<string, unknown>,
): string[] {
  const unknownFields: string[] = [];
  collectUnknownFieldsRecursive(raw, parsed, [], unknownFields);
  return unknownFields;
}

export interface ConfigLoadMetadata {
  migration: MigrationResult;
  unknownFields: string[];
  isFutureVersion: boolean;
  canMutate: boolean;
}

export interface ConfigLoadResult {
  config: TildeConfig;
  metadata: ConfigLoadMetadata;
}

export async function loadConfig(
  pathOrUrl: string,
  onMigrated?: (result: MigrationResult) => void,
): Promise<TildeConfig> {
  const result = await loadConfigWithMetadata(pathOrUrl, onMigrated);
  return result.config;
}

export async function loadConfigWithMetadata(
  pathOrUrl: string,
  onMigrated?: (result: MigrationResult) => void,
): Promise<ConfigLoadResult> {
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

  const result = TildeConfigSchema.safeParse(migrationResult.config);
  if (!result.success) {
    const validationError = fromZodError(result.error);
    throw new Error(`Config validation failed:\n${validationError.message}`);
  }

  const unknownFields = migrationResult.isFutureVersion
    ? []
    : collectUnknownConfigFields(migrationResult.config, result.data as Record<string, unknown>);
  const canMutate = !migrationResult.isFutureVersion;

  if (unknownFields.length > 0) {
    console.warn(`[tilde] Warning: unknown config field(s) will be removed on rewrite: ${unknownFields.join(', ')}`);
  }

  if (!migrationResult.isFutureVersion && !pathOrUrl.startsWith('http') && (migrationResult.didMigrate || unknownFields.length > 0)) {
    const expandedPath = expandTilde(pathOrUrl);
    const migratedContent = JSON.stringify(result.data, null, 2) + '\n';
    await atomicWriteConfig(expandedPath, migratedContent);
    if (migrationResult.didMigrate) {
      onMigrated?.(migrationResult);
    }
  }

  return {
    config: result.data,
    metadata: {
      migration: migrationResult,
      unknownFields,
      isFutureVersion: migrationResult.isFutureVersion,
      canMutate,
    },
  };
}
