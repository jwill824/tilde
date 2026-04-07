import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

vi.mock('../../src/plugins/registry.js', () => ({
  pluginRegistry: {},
}));

const VALID_CONFIG = JSON.stringify({
  $schema: 'https://thingstead.io/tilde/config-schema/v1.json',
  version: '1',
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

describe('ConfigFirstMode', () => {
  beforeEach(() => {
    vi.resetModules();
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
});
