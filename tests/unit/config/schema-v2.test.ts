import { describe, it, expect } from 'vitest';
import { TildeConfigSchema } from '../../../src/config/schema.js';
import { CURRENT_SCHEMA_VERSION } from '../../../src/config/migrations/runner.js';

const MINIMAL_CONFIG = {
  $schema: 'https://thingstead.io/tilde/config-schema/v1.json',
  version: '1' as const,
  os: 'macos' as const,
  shell: 'zsh' as const,
  packageManagers: ['homebrew'] as const,
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
  it('valid config with schemaVersion: "1.7" passes Zod validation', () => {
    const result = TildeConfigSchema.safeParse({ ...MINIMAL_CONFIG, schemaVersion: '1.7' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe('1.7');
    }
  });

  it('rejects numeric schemaVersion values instead of coercing them', () => {
    const result = TildeConfigSchema.safeParse({ ...MINIMAL_CONFIG, schemaVersion: 1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map(issue => issue.message).join('\n')).toMatch(/schemaVersion.*string.*major\.minor/i);
    }
  });

  it('rejects configs without schemaVersion instead of defaulting them', () => {
    const result = TildeConfigSchema.safeParse(MINIMAL_CONFIG);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map(issue => issue.message).join('\n')).toMatch(/schemaVersion.*required|schemaVersion.*major\.minor/i);
    }
  });

  it('rejects patch-bearing schemaVersion values', () => {
    const result = TildeConfigSchema.safeParse({ ...MINIMAL_CONFIG, schemaVersion: '1.7.1' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map(issue => issue.message).join('\n')).toMatch(/schemaVersion.*major\.minor.*patch/i);
    }
  });

  it('JSON.stringify of a parsed config includes schemaVersion as a string', () => {
    const result = TildeConfigSchema.safeParse({ ...MINIMAL_CONFIG, schemaVersion: '1.7' });
    expect(result.success).toBe(true);
    if (result.success) {
      const json = JSON.stringify(result.data);
      const parsed = JSON.parse(json) as Record<string, unknown>;
      expect(typeof parsed['schemaVersion']).toBe('string');
    }
  });

  it('CURRENT_SCHEMA_VERSION is "1.7"', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe('1.7');
  });

  it('config schemaVersion can match CURRENT_SCHEMA_VERSION explicitly', () => {
    const result = TildeConfigSchema.safeParse({ ...MINIMAL_CONFIG, schemaVersion: CURRENT_SCHEMA_VERSION });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    }
  });

  it('continues to accept deprecated top-level version metadata without using it as schema authority', () => {
    const result = TildeConfigSchema.safeParse({
      ...MINIMAL_CONFIG,
      version: '1',
      schemaVersion: '1.7',
    });
    expect(result.success).toBe(true);
  });
});
