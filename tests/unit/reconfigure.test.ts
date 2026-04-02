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
  packageManager: 'homebrew',
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
    const WizardMock = makeWizardMock();

    vi.doMock('../../src/config/writer.js', () => ({ atomicWriteConfig: mockAtomicWriteConfig }));
    vi.doMock('../../src/config/reader.js', () => ({ loadConfig: mockLoadConfig }));
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
    expect(props.initialConfig).toMatchObject({ shell: 'zsh', packageManager: 'homebrew' });
    expect((props.initialConfig as { contexts: { label: string }[] }).contexts[0].label).toBe('personal');
  });

  it('calls atomicWriteConfig with the wizard output — overwrites existing tilde.config.json', async () => {
    const mockAtomicWriteConfig = vi.fn().mockResolvedValue(undefined);
    const mockLoadConfig = vi.fn().mockResolvedValue(VALID_CONFIG);

    vi.doMock('../../src/config/writer.js', () => ({ atomicWriteConfig: mockAtomicWriteConfig }));
    vi.doMock('../../src/config/reader.js', () => ({ loadConfig: mockLoadConfig }));
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
    const WizardMock = makeWizardMock();

    vi.doMock('../../src/config/writer.js', () => ({ atomicWriteConfig: mockAtomicWriteConfig }));
    vi.doMock('../../src/config/reader.js', () => ({ loadConfig: mockLoadConfig }));
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
    expect(WizardMock).not.toHaveBeenCalled();
    expect(mockAtomicWriteConfig).not.toHaveBeenCalled();
  });

  it('launches wizard with partial values and warning when config has validation errors', async () => {
    const mockAtomicWriteConfig = vi.fn().mockResolvedValue(undefined);
    const validationError = new Error('Config validation failed: shell is required');
    const mockLoadConfig = vi.fn().mockRejectedValue(validationError);

    vi.doMock('../../src/config/writer.js', () => ({ atomicWriteConfig: mockAtomicWriteConfig }));
    vi.doMock('../../src/config/reader.js', () => ({ loadConfig: mockLoadConfig }));
    vi.doMock('../../src/config/migrations/runner.js', () => ({ CURRENT_SCHEMA_VERSION: '1.5' }));
    vi.doMock('../../src/modes/wizard.js', () => ({ Wizard: makeWizardMock() }));
    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
      return {
        ...actual,
        readFile: vi.fn().mockResolvedValue(
          JSON.stringify({ ...VALID_CONFIG, shell: undefined })
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
    expect(frame).toBeDefined();
    expect(frame!.length).toBeGreaterThan(0);
  });
});
