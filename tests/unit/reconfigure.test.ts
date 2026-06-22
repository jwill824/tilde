/**
 * Unit tests for the --reconfigure flag (T091).
 *
 * Asserts that:
 * 1. ReconfigureMode loads an existing config and passes it as initialConfig to
 *    the wizard (pre-populated defaults)
 * 2. When the wizard completes, atomicWriteConfig is called — overwriting the
 *    existing tilde.config.json at the provided configPath
 * 3. When no config file exists (ENOENT), an actionable error is shown and the
 *    wizard is NOT launched
 * 4. When the config has validation errors, partial values are passed and the
 *    wizard still launches with a warning summary
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_CONFIG = {
  $schema: 'https://thingstead.io/tilde/config-schema/v1.json',
  schemaVersion: '1.5',
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

const CONFIG_PATH = '/fake/tilde.config.json';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSupportedLoadResult(config: Record<string, unknown>) {
  return {
    config,
    metadata: {
      migration: {
        config,
        migratedFrom: String(config.schemaVersion ?? '1.5'),
        migratedTo: '1.5',
        didMigrate: false,
        isFutureVersion: false,
      },
      unknownFields: [],
      isFutureVersion: false,
      canMutate: true,
    },
  };
}

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

function mockConfigReader(
  mockLoadConfig: ReturnType<typeof vi.fn>,
  mockLoadConfigWithMetadata?: ReturnType<typeof vi.fn>,
) {
  const loadConfigWithMetadata = mockLoadConfigWithMetadata ?? vi.fn(async (...args: unknown[]) => {
    const config = await mockLoadConfig(...args);
    return makeSupportedLoadResult(config as Record<string, unknown>);
  });
  vi.doMock('../../src/config/reader.js', () => ({
    loadConfig: mockLoadConfig,
    loadConfigWithMetadata,
  }));
  return loadConfigWithMetadata;
}

function makeWizardMock(onMounted?: (props: { initialConfig: Record<string, unknown>; onComplete: (cfg: Record<string, unknown>) => void }) => void) {
  return vi.fn((props: {
    initialConfig: Record<string, unknown>;
    onComplete: (cfg: Record<string, unknown>) => void;
    onExit: () => void;
  }) => {
    React.useEffect(() => {
      if (onMounted) {
        onMounted(props);
      } else {
        props.onComplete({ ...props.initialConfig, _testCompleted: true });
      }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ReconfigureMode (--reconfigure flag)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders wizard with pre-populated defaults from existing config', async () => {
    const mockAtomicWriteConfig = vi.fn().mockResolvedValue(undefined);
    const mockLoadConfig = vi.fn().mockResolvedValue(VALID_CONFIG);
    const WizardMock = makeWizardMock(() => undefined);

    vi.doMock('../../src/config/writer.js', () => ({ atomicWriteConfig: mockAtomicWriteConfig }));
    mockConfigReader(mockLoadConfig);
    vi.doMock('../../src/config/migrations/runner.js', () => ({ CURRENT_SCHEMA_VERSION: '1.5' }));
    vi.doMock('../../src/modes/wizard.js', () => ({ Wizard: WizardMock }));

    const { ReconfigureMode } = await import('../../src/modes/reconfigure.js');
    render(
      React.createElement(ReconfigureMode, {
        configPath: CONFIG_PATH,
        environment: {} as never,
        onComplete: vi.fn(),
      })
    );

    await new Promise(resolve => setTimeout(resolve, 200));

    // Check that Wizard was called with the loaded config as initialConfig
    expect(WizardMock).toHaveBeenCalled();
    const props = WizardMock.mock.calls[0][0];
    expect(props.initialConfig).toMatchObject({ shell: 'zsh', packageManagers: ['homebrew'] });
    expect((props.initialConfig as { contexts: { label: string }[] }).contexts[0].label).toBe('personal');
  });

  it('calls atomicWriteConfig with the wizard output — overwrites existing tilde.config.json', async () => {
    const mockAtomicWriteConfig = vi.fn().mockResolvedValue(undefined);
    const mockLoadConfig = vi.fn().mockResolvedValue(VALID_CONFIG);

    vi.doMock('../../src/config/writer.js', () => ({ atomicWriteConfig: mockAtomicWriteConfig }));
    mockConfigReader(mockLoadConfig);
    vi.doMock('../../src/config/migrations/runner.js', () => ({ CURRENT_SCHEMA_VERSION: '1.5' }));
    vi.doMock('../../src/modes/wizard.js', () => ({ Wizard: makeWizardMock() }));

    const { ReconfigureMode } = await import('../../src/modes/reconfigure.js');
    render(
      React.createElement(ReconfigureMode, {
        configPath: CONFIG_PATH,
        environment: {} as never,
        onComplete: vi.fn(),
      })
    );

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(mockAtomicWriteConfig).toHaveBeenCalledTimes(1);
    expect(mockAtomicWriteConfig).toHaveBeenCalledWith(
      CONFIG_PATH,
      expect.stringContaining('"schemaVersion"')
    );
    const writtenContent = mockAtomicWriteConfig.mock.calls[0][1] as string;
    const written = JSON.parse(writtenContent) as Record<string, unknown>;
    expect(written.shell).toBe('zsh');
    expect(written.schemaVersion).toBe('1.5');
  });

  it('shows actionable error when config file does not exist (ENOENT) — wizard NOT launched', async () => {
    const mockAtomicWriteConfig = vi.fn().mockResolvedValue(undefined);
    const notFoundError = Object.assign(new Error('not found'), { code: 'ENOENT' });
    const mockLoadConfig = vi.fn().mockRejectedValue(notFoundError);
    const WizardMock = makeWizardMock(() => undefined);

    vi.doMock('../../src/config/writer.js', () => ({ atomicWriteConfig: mockAtomicWriteConfig }));
    mockConfigReader(mockLoadConfig);
    vi.doMock('../../src/config/migrations/runner.js', () => ({ CURRENT_SCHEMA_VERSION: '1.5' }));
    vi.doMock('../../src/modes/wizard.js', () => ({ Wizard: WizardMock }));

    const { ReconfigureMode } = await import('../../src/modes/reconfigure.js');
    const { lastFrame } = render(
      React.createElement(ReconfigureMode, {
        configPath: '/nonexistent/tilde.config.json',
        environment: {} as never,
        onComplete: vi.fn(),
      })
    );

    await new Promise(resolve => setTimeout(resolve, 200));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('not found');
    expect(frame).not.toContain('Searched:');
    expect(WizardMock).not.toHaveBeenCalled();
    expect(mockAtomicWriteConfig).not.toHaveBeenCalled();
  });

  it('shows shared wizard-first guidance when no config path is available', async () => {
    const mockAtomicWriteConfig = vi.fn().mockResolvedValue(undefined);
    const mockLoadConfig = vi.fn().mockResolvedValue(VALID_CONFIG);
    const WizardMock = makeWizardMock(() => undefined);

    vi.doMock('../../src/config/writer.js', () => ({ atomicWriteConfig: mockAtomicWriteConfig }));
    mockConfigReader(mockLoadConfig);
    vi.doMock('../../src/config/migrations/runner.js', () => ({ CURRENT_SCHEMA_VERSION: '1.5' }));
    vi.doMock('../../src/modes/wizard.js', () => ({ Wizard: WizardMock }));
    vi.doMock('../../src/utils/config-discovery.js', () => ({
      formatNoConfigError: vi.fn().mockResolvedValue(
        [
          'Error: tilde requires a config file to run reconfigure.',
          'Run the wizard to create one: tilde',
          'Searched:',
          '  /tmp/project/tilde.config.json',
          'Example locations:',
          '  ~/.tilde/tilde.config.json',
          '  ~/.config/tilde/tilde.config.json',
          '  ~/tilde.config.json',
          'Or specify: tilde --reconfigure --config <path>',
        ].join('\n')
      ),
    }));

    const { ReconfigureMode } = await import('../../src/modes/reconfigure.js');
    const { lastFrame } = render(
      React.createElement(ReconfigureMode, {
        configPath: '',
        environment: {} as never,
        onComplete: vi.fn(),
      })
    );

    await new Promise(resolve => setTimeout(resolve, 200));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Run the wizard to create one: tilde');
    expect(frame).toContain('Searched:');
    expect(frame).toContain('~/.config/tilde/tilde.config.json');
    expect(frame).toContain('tilde --reconfigure --config <path>');
    expect(mockLoadConfig).not.toHaveBeenCalled();
    expect(WizardMock).not.toHaveBeenCalled();
  });

  it('launches wizard with partial values and warning when config has validation errors', async () => {
    const mockAtomicWriteConfig = vi.fn().mockResolvedValue(undefined);
    const validationError = new Error('Config validation failed: shell is required');
    const mockLoadConfig = vi.fn().mockRejectedValue(validationError);
    const WizardMock = makeWizardMock(() => undefined);

    vi.doMock('../../src/config/writer.js', () => ({ atomicWriteConfig: mockAtomicWriteConfig }));
    mockConfigReader(mockLoadConfig);
    vi.doMock('../../src/config/migrations/runner.js', () => ({ CURRENT_SCHEMA_VERSION: '1.5' }));
    vi.doMock('../../src/modes/wizard.js', () => ({ Wizard: WizardMock }));
    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
      return {
        ...actual,
        readFile: vi.fn().mockResolvedValue(
          JSON.stringify({ ...VALID_CONFIG, shell: undefined, tools: 'cursor' })
        ),
      };
    });

    const { ReconfigureMode } = await import('../../src/modes/reconfigure.js');
    const { lastFrame } = render(
      React.createElement(ReconfigureMode, {
        configPath: CONFIG_PATH,
        environment: {} as never,
        onComplete: vi.fn(),
      })
    );

    await new Promise(resolve => setTimeout(resolve, 200));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Config has invalid fields');
    expect(frame).toContain('shell');
    expect(frame).toContain('tools');
    expect(WizardMock).toHaveBeenCalled();
    const props = WizardMock.mock.calls[0][0];
    expect(props.initialConfig).toMatchObject({
      packageManagers: ['homebrew'],
      workspaceRoot: '~/Developer',
      configurations: VALID_CONFIG.configurations,
    });
    expect(props.initialConfig.shell).toBeUndefined();
    expect(props.initialConfig.tools).toBeUndefined();
    expect(mockAtomicWriteConfig).not.toHaveBeenCalled();
  });

  it('shows an error for malformed JSON instead of launching a blank wizard', async () => {
    const mockAtomicWriteConfig = vi.fn().mockResolvedValue(undefined);
    const validationError = new Error('Failed to parse config as JSON: Unexpected token');
    const mockLoadConfig = vi.fn().mockRejectedValue(validationError);
    const WizardMock = makeWizardMock();

    vi.doMock('../../src/config/writer.js', () => ({ atomicWriteConfig: mockAtomicWriteConfig }));
    mockConfigReader(mockLoadConfig);
    vi.doMock('../../src/config/migrations/runner.js', () => ({ CURRENT_SCHEMA_VERSION: '1.5' }));
    vi.doMock('../../src/modes/wizard.js', () => ({ Wizard: WizardMock }));
    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
      return {
        ...actual,
        readFile: vi.fn().mockResolvedValue('{ invalid json'),
      };
    });

    const { ReconfigureMode } = await import('../../src/modes/reconfigure.js');
    const { lastFrame } = render(
      React.createElement(ReconfigureMode, {
        configPath: CONFIG_PATH,
        environment: {} as never,
        onComplete: vi.fn(),
      })
    );

    await new Promise(resolve => setTimeout(resolve, 200));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Failed to parse config');
    expect(frame).toMatch(/original file was[\s\S]*not modified/);
    expect(WizardMock).not.toHaveBeenCalled();
    expect(mockAtomicWriteConfig).not.toHaveBeenCalled();
  });

  it('omits schema-invalid nested contexts during partial recovery', async () => {
    const mockAtomicWriteConfig = vi.fn().mockResolvedValue(undefined);
    const validationError = new Error('Config validation failed: envVar value must be a backend reference');
    const mockLoadConfig = vi.fn().mockRejectedValue(validationError);
    const WizardMock = makeWizardMock(() => undefined);

    vi.doMock('../../src/config/writer.js', () => ({ atomicWriteConfig: mockAtomicWriteConfig }));
    mockConfigReader(mockLoadConfig);
    vi.doMock('../../src/config/migrations/runner.js', () => ({ CURRENT_SCHEMA_VERSION: '1.5' }));
    vi.doMock('../../src/modes/wizard.js', () => ({ Wizard: WizardMock }));
    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
      return {
        ...actual,
        readFile: vi.fn().mockResolvedValue(
          JSON.stringify({
            ...VALID_CONFIG,
            contexts: [
              {
                ...VALID_CONFIG.contexts[0],
                envVars: [{ key: 'TOKEN', value: 'ghp_rawsecret' }],
              },
            ],
          })
        ),
      };
    });

    const { ReconfigureMode } = await import('../../src/modes/reconfigure.js');
    render(
      React.createElement(ReconfigureMode, {
        configPath: CONFIG_PATH,
        environment: {} as never,
        onComplete: vi.fn(),
      })
    );

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(WizardMock).toHaveBeenCalled();
    const props = WizardMock.mock.calls[0][0];
    expect(props.initialConfig.contexts).toBeUndefined();
    expect(props.initialConfig.packageManagers).toEqual(['homebrew']);
    expect(mockAtomicWriteConfig).not.toHaveBeenCalled();
  });

  it('blocks future-schema configs before recovery or save and tells the user to upgrade', async () => {
    const mockAtomicWriteConfig = vi.fn().mockResolvedValue(undefined);
    const mockLoadConfig = vi.fn().mockResolvedValue(VALID_CONFIG);
    const mockLoadConfigWithMetadata = vi.fn().mockResolvedValue(makeFutureLoadResult());
    const WizardMock = makeWizardMock();

    vi.doMock('../../src/config/writer.js', () => ({ atomicWriteConfig: mockAtomicWriteConfig }));
    mockConfigReader(mockLoadConfig, mockLoadConfigWithMetadata);
    vi.doMock('../../src/config/migrations/runner.js', () => ({ CURRENT_SCHEMA_VERSION: '1.7' }));
    vi.doMock('../../src/modes/wizard.js', () => ({ Wizard: WizardMock }));

    const { ReconfigureMode } = await import('../../src/modes/reconfigure.js');
    const { lastFrame } = render(
      React.createElement(ReconfigureMode, {
        configPath: CONFIG_PATH,
        environment: {} as never,
        onComplete: vi.fn(),
      })
    );

    await new Promise(resolve => setTimeout(resolve, 200));

    const frame = lastFrame() ?? '';
    expect(mockLoadConfigWithMetadata).toHaveBeenCalledWith(CONFIG_PATH, { rewrite: true });
    expect(frame).toContain('newer than this version of tilde supports');
    expect(frame).toContain('Upgrade tilde');
    expect(WizardMock).not.toHaveBeenCalled();
    expect(mockAtomicWriteConfig).not.toHaveBeenCalled();
  });

  it('validates wizard output before saving reconfigured config', async () => {
    const mockAtomicWriteConfig = vi.fn().mockResolvedValue(undefined);
    const mockLoadConfig = vi.fn().mockResolvedValue(VALID_CONFIG);
    const WizardMock = makeWizardMock((props) => {
      props.onComplete({
        ...VALID_CONFIG,
        contexts: [
          {
            ...VALID_CONFIG.contexts[0],
            envVars: [{ key: 'TOKEN', value: 'ghp_rawsecret' }],
          },
        ],
      });
    });

    vi.doMock('../../src/config/writer.js', () => ({ atomicWriteConfig: mockAtomicWriteConfig }));
    mockConfigReader(mockLoadConfig);
    vi.doMock('../../src/config/migrations/runner.js', () => ({ CURRENT_SCHEMA_VERSION: '1.5' }));
    vi.doMock('../../src/modes/wizard.js', () => ({ Wizard: WizardMock }));

    const { ReconfigureMode } = await import('../../src/modes/reconfigure.js');
    const { lastFrame } = render(
      React.createElement(ReconfigureMode, {
        configPath: CONFIG_PATH,
        environment: {} as never,
        onComplete: vi.fn(),
      })
    );

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(lastFrame()).toContain('Failed to save config');
    expect(lastFrame()).toContain('envVar value must be a backend reference');
    expect(mockAtomicWriteConfig).not.toHaveBeenCalled();
  });
});
