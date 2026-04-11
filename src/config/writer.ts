import { writeFile, rename, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { TildeConfig } from './schema.js';
import { CURRENT_SCHEMA_VERSION } from './migrations/runner.js';

const SECRET_PATTERN = /^(ghp_|sk-|AKIA|xox[bp]-)/;

function expandTilde(p: string): string {
  if (p.startsWith('~/')) {
    return join(homedir(), p.slice(2));
  }
  return p;
}

function containsSecret(config: TildeConfig): boolean {
  for (const context of config.contexts) {
    for (const envVar of context.envVars ?? []) {
      if (SECRET_PATTERN.test(envVar.value)) {
        return true;
      }
    }
  }
  return false;
}

export async function atomicWriteConfig(targetPath: string, content: string): Promise<void> {
  const tmpPath = `${targetPath}.tmp`;
  await writeFile(tmpPath, content, 'utf-8');
  try {
    await rename(tmpPath, targetPath);
  } catch (err) {
    try { await unlink(tmpPath); } catch { /* ignore cleanup failure */ }
    throw err;
  }
}

export async function writeConfig(
  config: TildeConfig,
  dotfilesRepo?: string | null,
): Promise<string> {
  if (containsSecret(config)) {
    throw new Error(
      'Refusing to write config: one or more envVar values appear to be raw secrets. ' +
      'Use backend references (e.g., op://Vault/Item/Field) instead.'
    );
  }

  const home = homedir();
  const canonicalDir = join(home, '.tilde');
  const configWithVersion = { ...config, schemaVersion: CURRENT_SCHEMA_VERSION };
  const content = JSON.stringify(configWithVersion, null, 2) + '\n';

  // Always write canonical copy so discoverConfig() finds it at ~/.tilde/tilde.config.json
  await mkdir(canonicalDir, { recursive: true });
  const canonicalPath = join(canonicalDir, 'tilde.config.json');

  if (!dotfilesRepo) {
    await atomicWriteConfig(canonicalPath, content);
    return canonicalPath;
  }

  const repoPath = expandTilde(dotfilesRepo);
  await mkdir(repoPath, { recursive: true });
  const outputPath = join(repoPath, 'tilde.config.json');
  await atomicWriteConfig(outputPath, content);

  if (repoPath !== canonicalDir) {
    await atomicWriteConfig(canonicalPath, content);
  }

  return outputPath;
}
