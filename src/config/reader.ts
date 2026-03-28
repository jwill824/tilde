import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fromZodError } from 'zod-validation-error';
import { TildeConfigSchema, type TildeConfig } from './schema.js';
import { migrateConfig } from './migrations/v1.js';

function expandTilde(p: string): string {
  if (p.startsWith('~/')) {
    return join(homedir(), p.slice(2));
  }
  return p;
}

export async function loadConfig(pathOrUrl: string): Promise<TildeConfig> {
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
    throw new Error(`Failed to parse config as JSON: ${(e as Error).message}`);
  }

  // Run migration before validation
  const rawRecord = (typeof raw === 'object' && raw !== null) ? raw as Record<string, unknown> : {};
  const fromVersion = typeof rawRecord['schemaVersion'] === 'number' ? rawRecord['schemaVersion'] : 1;
  const migrated = migrateConfig(raw, fromVersion);

  const result = TildeConfigSchema.safeParse(migrated);
  if (!result.success) {
    const validationError = fromZodError(result.error);
    throw new Error(`Config validation failed:\n${validationError.message}`);
  }

  return result.data;
}
