import { describe, it, expect } from 'vitest';
import { TildeConfigSchema } from '../../../src/config/schema.js';
import { CURRENT_SCHEMA_VERSION } from '../../../src/config/migrations/runner.js';

const MINIMAL_CONFIG = {
  $schema: 'https://tilde.sh/config-schema/v1.json',
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
  tools: [],
  configurations: {
    git: true,
    vscode: false,
    aliases: false,
    osDefaults: false,
    direnv: true,
  },
  secretsBackend: '1password' as const,
};

describe('schemaVersion field — round-trip', () => {
  it('valid config with schemaVersion: 1 passes Zod validation', () => {
    const result = TildeConfigSchema.safeParse({ ...MINIMAL_CONFIG, schemaVersion: 1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe(1);
    }
  });

  it('config without schemaVersion field defaults to 1 (.default(1) backward compat)', () => {
    const result = TildeConfigSchema.safeParse(MINIMAL_CONFIG);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe(1);
    }
  });

  it('config with schemaVersion: 0 fails validation (min(1))', () => {
    const result = TildeConfigSchema.safeParse({ ...MINIMAL_CONFIG, schemaVersion: 0 });
    expect(result.success).toBe(false);
  });

  it('config with schemaVersion: 1.5 fails validation (.int())', () => {
    const result = TildeConfigSchema.safeParse({ ...MINIMAL_CONFIG, schemaVersion: 1.5 });
    expect(result.success).toBe(false);
  });

  it('JSON.stringify of a parsed config always includes "schemaVersion": 1 in the output', () => {
    const result = TildeConfigSchema.safeParse(MINIMAL_CONFIG);
    expect(result.success).toBe(true);
    if (result.success) {
      const json = JSON.stringify(result.data);
      const parsed = JSON.parse(json) as Record<string, unknown>;
      expect(parsed['schemaVersion']).toBe(1);
    }
  });

  it('CURRENT_SCHEMA_VERSION matches schemaVersion default in schema', () => {
    const result = TildeConfigSchema.safeParse(MINIMAL_CONFIG);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    }
  });
});
