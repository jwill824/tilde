import { describe, it, expect } from 'vitest';
import { TildeConfigSchema } from '../../../src/config/schema.js';
import { CURRENT_SCHEMA_VERSION } from '../../../src/config/migrations/runner.js';

const MINIMAL_CONFIG = {
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
  it('valid config with schemaVersion: "1.4" passes Zod validation', () => {
    const result = TildeConfigSchema.safeParse({ ...MINIMAL_CONFIG, schemaVersion: '1.4' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe('1.4');
    }
  });

  it('valid config with schemaVersion: 1 (integer) is coerced to string "1"', () => {
    const result = TildeConfigSchema.safeParse({ ...MINIMAL_CONFIG, schemaVersion: 1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe('1');
    }
  });

  it('config without schemaVersion field defaults to "1.4"', () => {
    const result = TildeConfigSchema.safeParse(MINIMAL_CONFIG);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe('1.4');
    }
  });

  it('config with schemaVersion: "1.5" (unknown future version) parses successfully', () => {
    // Schema accepts any string — version validation is the migration runner's job
    const result = TildeConfigSchema.safeParse({ ...MINIMAL_CONFIG, schemaVersion: '1.5' });
    expect(result.success).toBe(true);
  });

  it('JSON.stringify of a parsed config includes schemaVersion as a string', () => {
    const result = TildeConfigSchema.safeParse(MINIMAL_CONFIG);
    expect(result.success).toBe(true);
    if (result.success) {
      const json = JSON.stringify(result.data);
      const parsed = JSON.parse(json) as Record<string, unknown>;
      expect(typeof parsed['schemaVersion']).toBe('string');
    }
  });

  it('CURRENT_SCHEMA_VERSION is "1.4"', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe('1.4');
  });

  it('config default schemaVersion matches CURRENT_SCHEMA_VERSION', () => {
    const result = TildeConfigSchema.safeParse(MINIMAL_CONFIG);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    }
  });
});
