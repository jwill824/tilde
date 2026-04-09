import { describe, it, expect } from 'vitest';
import { TildeConfigSchema } from '../../src/config/schema.js';

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

describe('TildeConfigSchema', () => {
  it('accepts a valid minimal config', () => {
    const result = TildeConfigSchema.safeParse(MINIMAL_CONFIG);
    expect(result.success).toBe(true);
  });

  it('rejects config missing required fields', () => {
    const { shell, ...noShell } = MINIMAL_CONFIG;
    const result = TildeConfigSchema.safeParse(noShell);
    expect(result.success).toBe(false);
  });

  it('rejects config with missing contexts', () => {
    const noContexts = { ...MINIMAL_CONFIG, contexts: [] };
    const result = TildeConfigSchema.safeParse(noContexts);
    expect(result.success).toBe(false);
  });

  it('rejects config with duplicate context labels', () => {
    const dupContexts = {
      ...MINIMAL_CONFIG,
      contexts: [
        { ...MINIMAL_CONFIG.contexts[0], label: 'personal' },
        { ...MINIMAL_CONFIG.contexts[0], label: 'personal' },
      ],
    };
    const result = TildeConfigSchema.safeParse(dupContexts);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map(i => i.message);
      expect(messages.some(m => m.includes('Duplicate'))).toBe(true);
    }
  });

  it('rejects envVar value that looks like a GitHub token', () => {
    const withSecret = {
      ...MINIMAL_CONFIG,
      contexts: [
        {
          ...MINIMAL_CONFIG.contexts[0],
          envVars: [{ key: 'GH_TOKEN', value: 'ghp_abc123456789012345678' }],
        },
      ],
    };
    const result = TildeConfigSchema.safeParse(withSecret);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map(i => i.message);
      expect(messages.some(m => m.toLowerCase().includes('secret'))).toBe(true);
    }
  });

  it('accepts envVar with op:// backend reference', () => {
    const withRef = {
      ...MINIMAL_CONFIG,
      contexts: [
        {
          ...MINIMAL_CONFIG.contexts[0],
          envVars: [{ key: 'GH_TOKEN', value: 'op://Personal/GitHub/token' }],
        },
      ],
    };
    const result = TildeConfigSchema.safeParse(withRef);
    expect(result.success).toBe(true);
  });

  it('rejects dotfilesRepo with relative path', () => {
    const relPath = { ...MINIMAL_CONFIG, dotfilesRepo: 'relative/path' };
    const result = TildeConfigSchema.safeParse(relPath);
    expect(result.success).toBe(false);
  });

  it('accepts dotfilesRepo starting with ~/', () => {
    const withTilde = { ...MINIMAL_CONFIG, dotfilesRepo: '~/dotfiles' };
    const result = TildeConfigSchema.safeParse(withTilde);
    expect(result.success).toBe(true);
  });

  it('rejects languages with manager not in versionManagers', () => {
    const withLang = {
      ...MINIMAL_CONFIG,
      versionManagers: [],
      languages: [{ name: 'node', version: '20.0.0', manager: 'vfox' }],
    };
    const result = TildeConfigSchema.safeParse(withLang);
    expect(result.success).toBe(false);
  });

  it('accepts languages when manager is in versionManagers', () => {
    const withLang = {
      ...MINIMAL_CONFIG,
      versionManagers: [{ name: 'vfox' as const }],
      languages: [{ name: 'node', version: '20.0.0', manager: 'vfox' }],
    };
    const result = TildeConfigSchema.safeParse(withLang);
    expect(result.success).toBe(true);
  });

  // T045: packageManagers array tests
  it('accepts packageManagers as an array with one entry', () => {
    const result = TildeConfigSchema.safeParse(MINIMAL_CONFIG);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.packageManagers).toEqual(['homebrew']);
    }
  });

  it('accepts packageManagers with multiple entries', () => {
    const result = TildeConfigSchema.safeParse({ ...MINIMAL_CONFIG, packageManagers: ['homebrew', 'nix'] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.packageManagers).toEqual(['homebrew', 'nix']);
    }
  });

  it('rejects empty packageManagers array', () => {
    const result = TildeConfigSchema.safeParse({ ...MINIMAL_CONFIG, packageManagers: [] });
    expect(result.success).toBe(false);
  });

  it('defaults packageManagers to ["homebrew"] when omitted', () => {
    const { packageManagers: _, ...noPackageManagers } = MINIMAL_CONFIG;
    const result = TildeConfigSchema.safeParse(noPackageManagers);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.packageManagers).toEqual(['homebrew']);
    }
  });
});
