/**
 * Unit tests for tilde update command (T018).
 *
 * Tests resource validation, error outputs, and only-targeted-section behavior.
 */
import React from 'react';
import { render } from 'ink-testing-library';
import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest';
import {
  isValidUpdateResource,
  formatInvalidResourceError,
  VALID_UPDATE_RESOURCES,
  UpdateCommand,
  type UpdateResource,
} from '../../src/modes/update.js';

const readerMocks = vi.hoisted(() => ({
  loadConfig: vi.fn(),
  loadConfigWithMetadata: vi.fn(),
}));

const writerMocks = vi.hoisted(() => ({
  atomicWriteConfig: vi.fn(),
}));

vi.mock('../../src/config/reader.js', () => readerMocks);
vi.mock('../../src/config/writer.js', () => writerMocks);

const VALID_CONFIG = {
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
      envVars: [],
      languageBindings: [],
    },
  ],
  tools: [],
  configurations: { git: true, vscode: false, aliases: false, osDefaults: false, direnv: false },
  accounts: [],
  secretsBackend: '1password',
};

function makeFutureLoadResult() {
  const config = { ...VALID_CONFIG, schemaVersion: '1.8' };
  return {
    config,
    metadata: {
      migration: {
        config,
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

const waitForEffects = () => new Promise(resolve => setTimeout(resolve, 100));

beforeEach(() => {
  readerMocks.loadConfig.mockReset();
  readerMocks.loadConfigWithMetadata.mockReset();
  writerMocks.atomicWriteConfig.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('isValidUpdateResource()', () => {
  it('returns true for all valid resource names', () => {
    for (const resource of VALID_UPDATE_RESOURCES) {
      expect(isValidUpdateResource(resource)).toBe(true);
    }
  });

  it('returns false for unknown resource name', () => {
    expect(isValidUpdateResource('widgets')).toBe(false);
    expect(isValidUpdateResource('foo')).toBe(false);
    expect(isValidUpdateResource('')).toBe(false);
  });

  it('is case-sensitive (uppercase is invalid)', () => {
    expect(isValidUpdateResource('Shell')).toBe(false);
    expect(isValidUpdateResource('SHELL')).toBe(false);
  });

  it('valid resources are exactly the 7 documented ones', () => {
    expect(VALID_UPDATE_RESOURCES).toEqual([
      'shell', 'editor', 'applications', 'browser', 'ai-tools', 'contexts', 'languages',
    ]);
  });
});

describe('formatInvalidResourceError()', () => {
  it('includes the invalid resource name in the error', () => {
    const msg = formatInvalidResourceError('widgets');
    expect(msg).toContain('"widgets"');
    expect(msg).toContain('is not a valid update resource');
  });

  it('lists all valid resources', () => {
    const msg = formatInvalidResourceError('foo');
    for (const r of VALID_UPDATE_RESOURCES) {
      expect(msg).toContain(r);
    }
  });

  it('includes usage guidance', () => {
    const msg = formatInvalidResourceError('foo');
    expect(msg).toContain('tilde update <resource>');
  });
});

describe('VALID_UPDATE_RESOURCES contract', () => {
  it('includes shell', () => expect(VALID_UPDATE_RESOURCES).toContain('shell'));
  it('includes editor', () => expect(VALID_UPDATE_RESOURCES).toContain('editor'));
  it('includes applications', () => expect(VALID_UPDATE_RESOURCES).toContain('applications'));
  it('includes browser', () => expect(VALID_UPDATE_RESOURCES).toContain('browser'));
  it('includes ai-tools', () => expect(VALID_UPDATE_RESOURCES).toContain('ai-tools'));
  it('includes contexts', () => expect(VALID_UPDATE_RESOURCES).toContain('contexts'));
  it('includes languages', () => expect(VALID_UPDATE_RESOURCES).toContain('languages'));
});

describe('UpdateCommand future-schema guard', () => {
  it('blocks update UI and writes when config metadata cannot mutate', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    readerMocks.loadConfig.mockResolvedValue(VALID_CONFIG);
    readerMocks.loadConfigWithMetadata.mockResolvedValue(makeFutureLoadResult());

    const { lastFrame } = render(
      React.createElement(UpdateCommand, {
        resource: 'shell',
        configPath: '/fake/future/tilde.config.json',
      })
    );

    await waitForEffects();

    const frame = lastFrame() ?? '';
    expect(readerMocks.loadConfigWithMetadata).toHaveBeenCalledWith('/fake/future/tilde.config.json');
    expect(frame).toContain('Update Error');
    expect(frame).toContain('newer than this version of tilde supports');
    expect(frame).toContain('Upgrade tilde');
    expect(frame).not.toContain('Update: Shell');
    expect(writerMocks.atomicWriteConfig).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalledWith(0);
  });
});
