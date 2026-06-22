import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';

vi.mock('../../src/installer/index.js', () => ({
  installAll: vi.fn().mockResolvedValue({
    packages: { installed: [], skipped: [], failed: [] },
    languages: [],
    errors: [],
  }),
}));

vi.mock('../../src/dotfiles/writer.js', () => ({
  writeAll: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/config/writer.js', () => ({
  atomicWriteConfig: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/plugins/registry.js', () => ({
  pluginRegistry: {},
}));

const VALID_CONFIG = JSON.stringify({
  $schema: 'https://thingstead.io/tilde/config-schema/v1.json',
  version: '1',
  schemaVersion: '1.7',
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
    },
  ],
  tools: [],
  configurations: { git: true, vscode: false, aliases: false, osDefaults: false, direnv: true },
  secretsBackend: '1password',
});

const CONFIG_MISSING_CONTEXTS = JSON.stringify({
  $schema: 'https://thingstead.io/tilde/config-schema/v1.json',
  version: '1',
  schemaVersion: '1.7',
  os: 'macos',
  shell: 'zsh',
  packageManagers: ['homebrew'],
  versionManagers: [],
  languages: [],
  workspaceRoot: '~/Developer',
  dotfilesRepo: '~/Developer/personal/dotfiles',
  // contexts intentionally omitted
  tools: [],
  configurations: { git: true, vscode: false, aliases: false, osDefaults: false, direnv: true },
  secretsBackend: '1password',
});

const CONFIG_INVALID_TYPE = JSON.stringify({
  $schema: 'https://thingstead.io/tilde/config-schema/v1.json',
  version: '1',
  schemaVersion: '1.7',
  os: 'macos',
  shell: 42, // wrong type
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
    },
  ],
  tools: [],
  configurations: { git: true, vscode: false, aliases: false, osDefaults: false, direnv: true },
  secretsBackend: '1password',
});

const FUTURE_CONFIG = {
  $schema: 'https://thingstead.io/tilde/config-schema/v1.json',
  version: '1',
  schemaVersion: '1.8',
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
    },
  ],
  tools: [],
  configurations: { git: true, vscode: false, aliases: false, osDefaults: false, direnv: true },
  secretsBackend: '1password',
};

function makeFutureLoadResult() {
  return {
    config: FUTURE_CONFIG,
    metadata: {
      migration: {
        config: FUTURE_CONFIG,
        migratedFrom: '1.8',
        migratedTo: '1.7',
        didMigrate: false,
        isFutureVersion: true,
      },
      unknownFields: [],
      isFutureVersion: true,
      canMutate: false,
    },
  };
}

const waitForEffects = () => new Promise((r) => setTimeout(r, 200));

describe('ConfigFirstMode', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('../../src/config/reader.js');
    vi.doUnmock('node:fs/promises');
  });

  it('complete valid config → ConfigSummary rendered, no step components shown', async () => {
    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
      return { ...actual, readFile: vi.fn().mockResolvedValue(VALID_CONFIG) };
    });

    const { ConfigFirstMode } = await import('../../src/modes/config-first.js');
    const onComplete = vi.fn();
    const { lastFrame } = render(
      React.createElement(ConfigFirstMode, { configPath: '/fake/path.json', onComplete })
    );

    await new Promise((r) => setTimeout(r, 200));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Configuration Summary');
    expect(frame).toContain('personal');
    expect(frame).not.toContain('Contexts not specified');
    expect(frame).not.toContain('Shell not specified');
  });

  it('prompts before loading an auto-discovered config', async () => {
    const readFile = vi.fn().mockResolvedValue(VALID_CONFIG);
    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
      return { ...actual, readFile };
    });

    const { ConfigFirstMode } = await import('../../src/modes/config-first.js');
    const onComplete = vi.fn();
    const { lastFrame } = render(
      React.createElement(ConfigFirstMode, {
        configPath: '/fake/discovered/tilde.config.json',
        configPathSource: 'discovered',
        onComplete,
      })
    );

    await new Promise((r) => setTimeout(r, 100));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Found existing tilde.config.json');
    expect(frame).toContain('/fake/discovered/tilde.config.json');
    expect(frame).toContain('Use discovered config');
    expect(readFile).not.toHaveBeenCalled();
  });

  it('loads explicit configs without prompting', async () => {
    const readFile = vi.fn().mockResolvedValue(VALID_CONFIG);
    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
      return { ...actual, readFile };
    });

    const { ConfigFirstMode } = await import('../../src/modes/config-first.js');
    const onComplete = vi.fn();
    const { lastFrame } = render(
      React.createElement(ConfigFirstMode, {
        configPath: '/fake/explicit/tilde.config.json',
        configPathSource: 'flag',
        onComplete,
      })
    );

    await new Promise((r) => setTimeout(r, 200));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Configuration Summary');
    expect(frame).not.toContain('Use discovered config');
    expect(readFile).toHaveBeenCalled();
  });

  it('config with missing contexts field → context step component rendered', async () => {
    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
      return { ...actual, readFile: vi.fn().mockResolvedValue(CONFIG_MISSING_CONTEXTS) };
    });

    const { ConfigFirstMode } = await import('../../src/modes/config-first.js');
    const onComplete = vi.fn();
    const { lastFrame } = render(
      React.createElement(ConfigFirstMode, { configPath: '/fake/path.json', onComplete })
    );

    await new Promise((r) => setTimeout(r, 200));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Contexts not specified');
  });

  it('does not persist migrated recovery configs before missing fields are accepted', async () => {
    const oldConfigMissingContexts = JSON.stringify({
      $schema: 'https://thingstead.io/tilde/config-schema/v1.json',
      version: '1',
      schemaVersion: '1.0',
      os: 'macos',
      shell: 'zsh',
      packageManagers: ['homebrew'],
      versionManagers: [],
      languages: [],
      workspaceRoot: '~/Developer',
      dotfilesRepo: '~/Developer/personal/dotfiles',
      tools: [],
      configurations: { git: true, vscode: false, aliases: false, osDefaults: false, direnv: true },
      secretsBackend: '1password',
    });
    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
      return { ...actual, readFile: vi.fn().mockResolvedValue(oldConfigMissingContexts) };
    });

    const { atomicWriteConfig } = await import('../../src/config/writer.js');
    const { ConfigFirstMode } = await import('../../src/modes/config-first.js');
    const onComplete = vi.fn();
    const { lastFrame } = render(
      React.createElement(ConfigFirstMode, { configPath: '/fake/path.json', onComplete })
    );

    await new Promise((r) => setTimeout(r, 200));

    expect(lastFrame() ?? '').toContain('Contexts not specified');
    expect(atomicWriteConfig).not.toHaveBeenCalled();
  });

  it('config with invalid field type → error message shown with field path', async () => {
    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
      return { ...actual, readFile: vi.fn().mockResolvedValue(CONFIG_INVALID_TYPE) };
    });

    const { ConfigFirstMode } = await import('../../src/modes/config-first.js');
    const onComplete = vi.fn();
    const { lastFrame } = render(
      React.createElement(ConfigFirstMode, { configPath: '/fake/path.json', onComplete })
    );

    await new Promise((r) => setTimeout(r, 200));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Configuration Error');
    expect(frame).toContain('shell');
  });

  it('blocks explicit future-schema configs before apply choices', async () => {
    const loadConfigWithMetadata = vi.fn().mockResolvedValue(makeFutureLoadResult());
    vi.doMock('../../src/config/reader.js', () => ({ loadConfigWithMetadata }));

    const { installAll } = await import('../../src/installer/index.js');
    const { writeAll } = await import('../../src/dotfiles/writer.js');
    const { ConfigFirstMode } = await import('../../src/modes/config-first.js');
    const onComplete = vi.fn();
    const { lastFrame } = render(
      React.createElement(ConfigFirstMode, {
        configPath: '/fake/future/tilde.config.json',
        configPathSource: 'flag',
        onComplete,
      })
    );

    await waitForEffects();

    const frame = lastFrame() ?? '';
    expect(loadConfigWithMetadata).toHaveBeenCalledWith('/fake/future/tilde.config.json', expect.any(Function));
    expect(frame).toContain('newer than this version of tilde supports');
    expect(frame).toContain('Upgrade tilde');
    expect(frame).not.toContain('Apply this configuration');
    expect(installAll).not.toHaveBeenCalled();
    expect(writeAll).not.toHaveBeenCalled();
  });

  it('keeps discovered-config confirmation before blocking future-schema apply', async () => {
    const loadConfigWithMetadata = vi.fn().mockResolvedValue(makeFutureLoadResult());
    vi.doMock('../../src/config/reader.js', () => ({ loadConfigWithMetadata }));

    const { installAll } = await import('../../src/installer/index.js');
    const { writeAll } = await import('../../src/dotfiles/writer.js');
    const { ConfigFirstMode } = await import('../../src/modes/config-first.js');
    const onComplete = vi.fn();
    const { lastFrame, stdin } = render(
      React.createElement(ConfigFirstMode, {
        configPath: '/fake/discovered/tilde.config.json',
        configPathSource: 'discovered',
        onComplete,
      })
    );

    await new Promise((r) => setTimeout(r, 100));

    expect(lastFrame() ?? '').toContain('Use discovered config');
    expect(loadConfigWithMetadata).not.toHaveBeenCalled();

    stdin.write('\r');
    await waitForEffects();

    const frame = lastFrame() ?? '';
    expect(loadConfigWithMetadata).toHaveBeenCalledWith('/fake/discovered/tilde.config.json', expect.any(Function));
    expect(frame).toContain('newer than this version of tilde supports');
    expect(frame).toContain('Upgrade tilde');
    expect(frame).not.toContain('Apply this configuration');
    expect(installAll).not.toHaveBeenCalled();
    expect(writeAll).not.toHaveBeenCalled();
  });
});
