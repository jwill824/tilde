/**
 * Contract tests for config schema — schemaVersion field assertions.
 *
 * These tests verify the schemaVersion contract:
 * - writeConfig() always stamps schemaVersion: CURRENT_SCHEMA_VERSION
 * - loadConfig() accepts files without schemaVersion (defaults to 1)
 * - loadConfig() accepts files with schemaVersion: 1
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, readFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeConfig } from '../../src/config/writer.js';
import { loadConfig } from '../../src/config/reader.js';
import { CURRENT_SCHEMA_VERSION } from '../../src/config/migrations/runner.js';
import type { TildeConfig } from '../../src/config/schema.js';

const MINIMAL_CONFIG: TildeConfig = {
  $schema: 'https://thingstead.io/tilde/config-schema/v1.json',
  version: '1',
  schemaVersion: 1,
  os: 'macos',
  shell: 'zsh',
  packageManager: 'homebrew',
  versionManagers: [],
  languages: [],
  workspaceRoot: '~/Developer',
  dotfilesRepo: '~/Developer/personal/dotfiles',
  contexts: [
    {
      label: 'personal',
      path: '~/Developer/personal',
      git: { name: 'Test User', email: 'test@example.com' },
      authMethod: 'gh-cli',
      envVars: [],
    },
  ],
  tools: [],
  configurations: {
    git: true,
    vscode: false,
    aliases: false,
    osDefaults: false,
    direnv: false,
  },
  accounts: [],
  secretsBackend: '1password',
};

let tmpDir: string;

beforeEach(async () => {
  tmpDir = join(tmpdir(), `tilde-contract-schema-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  try {
    const { readdir } = await import('node:fs/promises');
    const files = await readdir(tmpDir);
    await Promise.all(files.map(f => unlink(join(tmpDir, f))));
    await import('node:fs/promises').then(m => m.rmdir(tmpDir));
  } catch {
    // ignore cleanup failures
  }
});

describe('writeConfig() — schemaVersion contract', () => {
  it('written config contains "schemaVersion": 1 as a top-level integer field', async () => {
    const outputPath = await writeConfig(MINIMAL_CONFIG, tmpDir);
    const content = await readFile(outputPath, 'utf-8');
    const parsed = JSON.parse(content) as Record<string, unknown>;
    expect(parsed['schemaVersion']).toBe(1);
    expect(Number.isInteger(parsed['schemaVersion'])).toBe(true);
  });

  it('written config schemaVersion matches CURRENT_SCHEMA_VERSION', async () => {
    const outputPath = await writeConfig(MINIMAL_CONFIG, tmpDir);
    const content = await readFile(outputPath, 'utf-8');
    const parsed = JSON.parse(content) as Record<string, unknown>;
    expect(parsed['schemaVersion']).toBe(CURRENT_SCHEMA_VERSION);
  });
});

describe('loadConfig() — schemaVersion contract', () => {
  it('config without schemaVersion field parses successfully with schemaVersion === 1', async () => {
    const configPath = join(tmpDir, 'no-schema-version.json');
    const { schemaVersion: _sv, ...withoutVersion } = MINIMAL_CONFIG;
    await writeFile(configPath, JSON.stringify(withoutVersion, null, 2), 'utf-8');

    const loaded = await loadConfig(configPath);
    expect(loaded.schemaVersion).toBe(1);
  });

  it('config with schemaVersion: 1 loads successfully and matches CURRENT_SCHEMA_VERSION', async () => {
    const configPath = join(tmpDir, 'with-schema-version.json');
    await writeFile(configPath, JSON.stringify(MINIMAL_CONFIG, null, 2), 'utf-8');

    const loaded = await loadConfig(configPath);
    expect(loaded.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });
});
