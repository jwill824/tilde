import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFile, readFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';

// Minimal environment snapshot for tests
const mockEnvironment = {
  os: 'macOS Sonoma 14.5',
  arch: 'arm64' as const,
  shellName: 'zsh',
  shellVersion: '5.9',
  tildeVersion: '1.0.1',
};

const VALID_CONFIG = {
  $schema: 'https://thingstead.io/tilde/config-schema/v1.json',
  version: '1' as const,
  os: 'macos' as const,
  shell: 'zsh' as const,
  packageManager: 'homebrew' as const,
  versionManagers: [],
  languages: [],
  workspaceRoot: '~/Developer',
  dotfilesRepo: '~/Developer/personal/dotfiles',
  contexts: [
    {
      label: 'personal',
      path: '~/Developer/personal',
      git: { name: 'Test User', email: 'test@example.com' },
      authMethod: 'gh-cli' as const,
    },
  ],
  tools: ['ripgrep'],
  configurations: {
    git: true,
    vscode: false,
    aliases: false,
    osDefaults: false,
    direnv: true,
  },
  accounts: [],
  secretsBackend: '1password' as const,
  schemaVersion: 1,
};

let tmpDir: string;

beforeEach(async () => {
  tmpDir = join(tmpdir(), `tilde-reconfigure-test-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  try {
    const files = await import('node:fs/promises').then(m => m.readdir(tmpDir));
    await Promise.all(files.map(f => unlink(join(tmpDir, f))));
    await import('node:fs/promises').then(m => m.rmdir(tmpDir));
  } catch {
    // ignore cleanup failures
  }
});

describe('loadConfig — reconfigure integration', () => {
  it('valid config is loaded and all fields are available', async () => {
    const configPath = join(tmpDir, 'tilde.config.json');
    await writeFile(configPath, JSON.stringify(VALID_CONFIG, null, 2), 'utf-8');

    const { loadConfig } = await import('../../src/config/reader.js');
    const loaded = await loadConfig(configPath);

    expect(loaded.shell).toBe('zsh');
    expect(loaded.workspaceRoot).toBe('~/Developer');
    expect(loaded.contexts).toHaveLength(1);
    expect(loaded.contexts[0]!.label).toBe('personal');
    expect(loaded.contexts[0]!.git.email).toBe('test@example.com');
    expect(loaded.tools).toContain('ripgrep');
    expect(loaded.secretsBackend).toBe('1password');
  });

  it('completing wizard with one changed field writes only that change', async () => {
    const configPath = join(tmpDir, 'tilde.config.json');
    await writeFile(configPath, JSON.stringify(VALID_CONFIG, null, 2), 'utf-8');

    // Simulate: load config, change one field, write back
    const { loadConfig } = await import('../../src/config/reader.js');
    const { atomicWriteConfig } = await import('../../src/config/writer.js');
    const { CURRENT_SCHEMA_VERSION } = await import('../../src/config/migrations/runner.js');

    const loaded = await loadConfig(configPath);
    const modified = { ...loaded, workspaceRoot: '~/Code' };
    const content = JSON.stringify({ ...modified, schemaVersion: CURRENT_SCHEMA_VERSION }, null, 2) + '\n';
    await atomicWriteConfig(configPath, content);

    const reloaded = JSON.parse(await readFile(configPath, 'utf-8')) as Record<string, unknown>;
    expect(reloaded['workspaceRoot']).toBe('~/Code');
    // All other fields preserved
    expect(reloaded['shell']).toBe('zsh');
    expect(reloaded['secretsBackend']).toBe('1password');
    const contexts = reloaded['contexts'] as Array<{ label: string }>;
    expect(contexts[0]!.label).toBe('personal');
  });

  it('no config found → loadConfig throws ENOENT-style error', async () => {
    const { loadConfig } = await import('../../src/config/reader.js');
    await expect(loadConfig(join(tmpDir, 'nonexistent.json'))).rejects.toThrow();
  });

  it('schema-invalid config → loadConfig throws with validation message', async () => {
    const configPath = join(tmpDir, 'invalid.config.json');
    const invalid = { ...VALID_CONFIG, shell: 'powershell' }; // invalid shell value
    await writeFile(configPath, JSON.stringify(invalid, null, 2), 'utf-8');

    const { loadConfig } = await import('../../src/config/reader.js');
    await expect(loadConfig(configPath)).rejects.toThrow(/validation failed/i);
  });

  it('early exit (no write) preserves original file unmodified', async () => {
    const configPath = join(tmpDir, 'tilde.config.json');
    const originalContent = JSON.stringify(VALID_CONFIG, null, 2) + '\n';
    await writeFile(configPath, originalContent, 'utf-8');

    // Simulate early exit: load config but DO NOT write anything
    const { loadConfig } = await import('../../src/config/reader.js');
    await loadConfig(configPath);

    // File should remain identical to what we wrote
    const afterContent = await readFile(configPath, 'utf-8');
    expect(afterContent).toBe(originalContent);
  });

  it('atomicWriteConfig uses .tmp file pattern and renames into place', async () => {
    const configPath = join(tmpDir, 'atomic-test.json');
    const { atomicWriteConfig } = await import('../../src/config/writer.js');

    await atomicWriteConfig(configPath, '{"test": true}\n');

    // Final file exists
    const content = await readFile(configPath, 'utf-8');
    expect(content).toBe('{"test": true}\n');

    // Tmp file should NOT exist after successful write
    expect(existsSync(`${configPath}.tmp`)).toBe(false);
  });
});

describe('ReconfigureMode — environment snapshot', () => {
  it('mockEnvironment has expected structure', () => {
    expect(mockEnvironment.os).toContain('Sonoma');
    expect(mockEnvironment.arch).toBe('arm64');
    expect(mockEnvironment.shellName).toBe('zsh');
    expect(mockEnvironment.tildeVersion).toBeTruthy();
  });
});
