import { describe, it, expect } from 'vitest';
import { fromZodError } from 'zod-validation-error';
import { TildeConfigSchema } from '../../src/config/schema.js';

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

describe('Config validation error formatting', () => {
  it('fromZodError produces human-readable message for missing required field', () => {
    const { shell: _shell, ...noShell } = MINIMAL_CONFIG;
    const result = TildeConfigSchema.safeParse(noShell);
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = fromZodError(result.error).message;
      expect(msg).toMatch(/shell/i);
      // Should be human-readable, not raw Zod internals
      expect(msg.length).toBeGreaterThan(5);
    }
  });

  it('schema rejects envVar value matching ghp_ pattern', () => {
    const withSecret = {
      ...MINIMAL_CONFIG,
      contexts: [
        {
          ...MINIMAL_CONFIG.contexts[0],
          envVars: [{ key: 'GH_TOKEN', value: 'ghp_abc123XYZ456789012' }],
        },
      ],
    };
    const result = TildeConfigSchema.safeParse(withSecret);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.toLowerCase().includes('secret'))).toBe(true);
    }
  });

  it('schema accepts envVar with op:// backend reference', () => {
    const withRef = {
      ...MINIMAL_CONFIG,
      contexts: [
        {
          ...MINIMAL_CONFIG.contexts[0],
          envVars: [{ key: 'GH_TOKEN', value: 'op://vault/item/field' }],
        },
      ],
    };
    const result = TildeConfigSchema.safeParse(withRef);
    expect(result.success).toBe(true);
  });
});
