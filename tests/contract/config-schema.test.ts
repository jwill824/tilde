/**
 * Contract tests for config schema — schemaVersion field assertions.
 *
 * These tests verify the schemaVersion contract:
 * - writeConfig() always stamps schemaVersion: CURRENT_SCHEMA_VERSION ('1.5')
 * - loadConfig() accepts files without schemaVersion (defaults to '1')
 * - loadConfig() migrates v1 configs to v1.5 automatically
 * - loadConfig() accepts files with schemaVersion: '1.5'
 * - v1.5 schema fields (browser, aiTools, editors, languageBindings) round-trip correctly
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, readFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { writeConfig } from '../../src/config/writer.js';
import { loadConfig } from '../../src/config/reader.js';
import { CURRENT_SCHEMA_VERSION } from '../../src/config/migrations/runner.js';
import type { TildeConfig } from '../../src/config/schema.js';

const MINIMAL_CONFIG: TildeConfig = {
  $schema: 'https://thingstead.io/tilde/config-schema/v1.json',
  version: '1',
  schemaVersion: '1.5',
  os: 'macos',
  shell: 'zsh',
  packageManagers: ['homebrew'],
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
      languageBindings: [],
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
  browser: { selected: [], default: null },
  aiTools: [],
};

const FULL_V1_4_CONFIG: TildeConfig = {
  ...MINIMAL_CONFIG,
  browser: {
    selected: ['arc', 'chrome'],
    default: 'arc',
  },
  editors: {
    primary: 'cursor',
    additional: ['neovim'],
  },
  aiTools: [
    { name: 'claude-code', label: 'Claude Code', variant: 'cli-tool' },
    { name: 'claude', label: 'Claude Desktop', variant: 'desktop-app' },
  ],
  contexts: [
    {
      label: 'personal',
      path: '~/Developer/personal',
      git: { name: 'Test User', email: 'test@example.com' },
      authMethod: 'gh-cli',
      envVars: [],
      languageBindings: [
        { runtime: 'nodejs', version: '22.0.0' },
      ],
    },
    {
      label: 'work',
      path: '~/Developer/work',
      git: { name: 'Test User', email: 'test@work.com' },
      authMethod: 'gh-cli',
      envVars: [],
      languageBindings: [
        { runtime: 'java', version: '21.0.3' },
        { runtime: 'nodejs', version: '18.20.0' },
      ],
    },
  ],
};

let tmpDir: string;

beforeEach(async () => {
  tmpDir = join(tmpdir(), `tilde-contract-schema-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  // Remove canonical copy written to ~/.tilde/tilde.config.json by writeConfig()
  // to avoid overwriting the developer's real config on every test run (H1).
  try {
    await unlink(join(homedir(), '.tilde', 'tilde.config.json'));
  } catch {
    // ignore — file may not exist if writeConfig wasn't called
  }
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
  it('written config contains schemaVersion as a top-level field', async () => {
    const outputPath = await writeConfig(MINIMAL_CONFIG, tmpDir);
    const content = await readFile(outputPath, 'utf-8');
    const parsed = JSON.parse(content) as Record<string, unknown>;
    expect(parsed['schemaVersion']).toBeDefined();
  });

  it('written config schemaVersion matches CURRENT_SCHEMA_VERSION', async () => {
    const outputPath = await writeConfig(MINIMAL_CONFIG, tmpDir);
    const content = await readFile(outputPath, 'utf-8');
    const parsed = JSON.parse(content) as Record<string, unknown>;
    expect(String(parsed['schemaVersion'])).toBe(CURRENT_SCHEMA_VERSION);
    expect(CURRENT_SCHEMA_VERSION).toBe('1.6');
  });
});

describe('loadConfig() — schemaVersion contract', () => {
  it('config without schemaVersion field parses and migrates to current version', async () => {
    const configPath = join(tmpDir, 'no-schema-version.json');
    const { schemaVersion: _sv, ...withoutVersion } = MINIMAL_CONFIG;
    // Remove schemaVersion — simulates old config
    const oldConfig = { ...withoutVersion };
    await writeFile(configPath, JSON.stringify(oldConfig, null, 2), 'utf-8');

    const loaded = await loadConfig(configPath);
    expect(String(loaded.schemaVersion)).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('config with schemaVersion: "1.5" loads successfully', async () => {
    const configPath = join(tmpDir, 'with-schema-version.json');
    await writeFile(configPath, JSON.stringify(MINIMAL_CONFIG, null, 2), 'utf-8');

    const loaded = await loadConfig(configPath);
    expect(String(loaded.schemaVersion)).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('v1 config (schemaVersion: 1) is migrated to v1.6', async () => {
    const configPath = join(tmpDir, 'v1-config.json');
    const v1Config = { ...MINIMAL_CONFIG, schemaVersion: 1 };
    await writeFile(configPath, JSON.stringify(v1Config, null, 2), 'utf-8');

    const loaded = await loadConfig(configPath);
    expect(String(loaded.schemaVersion)).toBe('1.6');
  });
});

describe('schema v1.5 — new fields round-trip', () => {
  it('browser field survives write/load cycle', async () => {
    const configPath = join(tmpDir, 'browser-config.json');
    await writeFile(configPath, JSON.stringify(FULL_V1_4_CONFIG, null, 2), 'utf-8');

    const loaded = await loadConfig(configPath);
    expect(loaded.browser).toEqual({ selected: ['arc', 'chrome'], default: 'arc' });
  });

  it('editors field survives write/load cycle', async () => {
    const configPath = join(tmpDir, 'editors-config.json');
    await writeFile(configPath, JSON.stringify(FULL_V1_4_CONFIG, null, 2), 'utf-8');

    const loaded = await loadConfig(configPath);
    expect(loaded.editors).toEqual({ primary: 'cursor', additional: ['neovim'] });
  });

  it('aiTools field survives write/load cycle', async () => {
    const configPath = join(tmpDir, 'ai-tools-config.json');
    await writeFile(configPath, JSON.stringify(FULL_V1_4_CONFIG, null, 2), 'utf-8');

    const loaded = await loadConfig(configPath);
    expect(loaded.aiTools).toHaveLength(2);
    expect(loaded.aiTools![0]).toEqual({ name: 'claude-code', label: 'Claude Code', variant: 'cli-tool' });
  });

  it('contexts[].languageBindings field survives write/load cycle', async () => {
    const configPath = join(tmpDir, 'lang-bindings-config.json');
    await writeFile(configPath, JSON.stringify(FULL_V1_4_CONFIG, null, 2), 'utf-8');

    const loaded = await loadConfig(configPath);
    expect(loaded.contexts[0].languageBindings).toEqual([{ runtime: 'nodejs', version: '22.0.0' }]);
    expect(loaded.contexts[1].languageBindings).toHaveLength(2);
  });
});

describe('schema v1.5 — v1 migration defaults', () => {
  it('v1 config without browser gets browser: { selected: [], default: null }', async () => {
    const configPath = join(tmpDir, 'v1-no-browser.json');
    const v1Config: Record<string, unknown> = {
      ...MINIMAL_CONFIG,
      schemaVersion: 1,
      browser: undefined,
    };
    delete v1Config['browser'];
    await writeFile(configPath, JSON.stringify(v1Config, null, 2), 'utf-8');

    const loaded = await loadConfig(configPath);
    expect(loaded.browser).toEqual({ selected: [], default: null });
  });

  it('v1 config without aiTools gets aiTools: []', async () => {
    const configPath = join(tmpDir, 'v1-no-ai-tools.json');
    const v1Config: Record<string, unknown> = { ...MINIMAL_CONFIG, schemaVersion: 1 };
    delete (v1Config as Record<string, unknown>)['aiTools'];
    await writeFile(configPath, JSON.stringify(v1Config, null, 2), 'utf-8');

    const loaded = await loadConfig(configPath);
    expect(loaded.aiTools).toEqual([]);
  });

  it('v1 config with editors as string gets normalized to object', async () => {
    const configPath = join(tmpDir, 'v1-editors-string.json');
    const v1Config = {
      ...MINIMAL_CONFIG,
      schemaVersion: 1,
      editors: 'vscode',  // old string form
    };
    await writeFile(configPath, JSON.stringify(v1Config, null, 2), 'utf-8');

    const loaded = await loadConfig(configPath);
    expect(loaded.editors).toEqual({ primary: 'vscode', additional: [] });
  });

  it('v1 context without languageBindings gets languageBindings: []', async () => {
    const configPath = join(tmpDir, 'v1-no-lang-bindings.json');
    const v1Config = {
      ...MINIMAL_CONFIG,
      schemaVersion: 1,
      contexts: [
        {
          label: 'personal',
          path: '~/Developer/personal',
          git: { name: 'Test', email: 'test@example.com' },
          authMethod: 'gh-cli',
          envVars: [],
          // no languageBindings
        },
      ],
    };
    await writeFile(configPath, JSON.stringify(v1Config, null, 2), 'utf-8');

    const loaded = await loadConfig(configPath);
    expect(loaded.contexts[0].languageBindings).toEqual([]);
  });
});
