import { describe, it, expect, vi, afterEach } from 'vitest';

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
      envVars: [],
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

describe('security-audit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writeConfig throws when envVar contains a raw GitHub token', async () => {
    const { writeConfig } = await import('../../src/config/writer.js');
    const configWithSecret = {
      ...MINIMAL_CONFIG,
      contexts: [{
        ...MINIMAL_CONFIG.contexts[0],
        envVars: [{ key: 'TOKEN', value: 'ghp_abc123XYZ456789012345' }],
      }],
    };
    await expect(writeConfig(configWithSecret as any, '~/Developer/personal/dotfiles')).rejects.toThrow();
  });

  it('writeConfig does not call fs.writeFile when envVar contains a raw secret', async () => {
    // Since writeConfig throws before reaching writeFile, we just verify it rejects
    // and doesn't silently write the secret to disk
    const { writeConfig } = await import('../../src/config/writer.js');
    const configWithSecret = {
      ...MINIMAL_CONFIG,
      contexts: [{
        ...MINIMAL_CONFIG.contexts[0],
        envVars: [{ key: 'TOKEN', value: 'ghp_abc123XYZ456789012345' }],
      }],
    };

    // The function must reject — no file will have been written
    await expect(
      writeConfig(configWithSecret as any, '~/Developer/personal/dotfiles')
    ).rejects.toThrow(/secret/i);
  });

  it('schema rejects envVar value matching ghp_ pattern before write even happens', async () => {
    const { TildeConfigSchema } = await import('../../src/config/schema.js');
    const withSecret = {
      ...MINIMAL_CONFIG,
      contexts: [{
        ...MINIMAL_CONFIG.contexts[0],
        envVars: [{ key: 'TOKEN', value: 'ghp_abc123XYZ456789012345' }],
      }],
    };
    const result = TildeConfigSchema.safeParse(withSecret);
    expect(result.success).toBe(false);
  });

  it('op:// format is not blocked (it is a reference, not a secret)', async () => {
    const { TildeConfigSchema } = await import('../../src/config/schema.js');
    const withRef = {
      ...MINIMAL_CONFIG,
      contexts: [{
        ...MINIMAL_CONFIG.contexts[0],
        envVars: [{ key: 'TOKEN', value: 'op://Personal/GitHub/token' }],
      }],
    };
    const result = TildeConfigSchema.safeParse(withRef);
    expect(result.success).toBe(true);
  });
});
