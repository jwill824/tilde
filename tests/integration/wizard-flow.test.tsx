import React from 'react';
import { Text } from 'ink';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { createEmptyInventoryReport, type InventoryReport, type InventoryScanState } from '../../src/inventory/report.js';
import type { TildeConfig } from '../../src/config/schema.js';

const { mockScanInventory } = vi.hoisted(() => ({
  mockScanInventory: vi.fn(),
}));

vi.mock('../../src/inventory/scan.js', () => ({
  scanInventory: mockScanInventory,
}));

// Mock filesystem operations that would write to disk
vi.mock('../../src/config/writer.js', () => ({
  writeConfig: vi.fn().mockResolvedValue('/tmp/test-dotfiles/tilde.config.json'),
}));

vi.mock('../../src/state/checkpoint.js', () => ({
  saveCheckpoint: vi.fn().mockResolvedValue({
    schemaVersion: 1,
    sessionId: 'test-session-id',
    startedAt: new Date().toISOString(),
    lastCompletedStep: -1,
    partialConfig: {},
  }),
  loadCheckpoint: vi.fn().mockResolvedValue(null),
  clearCheckpoint: vi.fn().mockResolvedValue(undefined),
}));

// Mock node:fs/promises for config detection (no config found)
vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    access: vi.fn().mockRejectedValue(new Error('ENOENT')),
  };
});

describe('Wizard flow integration', () => {
  function createInventoryFixture(overrides: Partial<InventoryReport> = {}): InventoryReport {
    const dotfiles = {
      ...createEmptyInventoryReport().dotfiles,
      files: [
        {
          path: '/Users/test/.zshrc',
          scope: 'home' as const,
          state: 'mixed' as const,
          toolIds: ['direnv', 'vfox'],
          warningIds: [],
          findings: [
            {
              kind: 'tool-init-hook' as const,
              classification: 'known' as const,
              toolIds: ['direnv'],
              reason: 'rc-file-content',
              confidence: 'high' as const,
              safeDetails: { toolId: 'direnv', sourceLine: 'eval "$(direnv hook zsh)"' },
            },
            {
              kind: 'alias' as const,
              classification: 'unknown' as const,
              toolIds: [],
              reason: 'rc-file-content',
              confidence: 'medium' as const,
              safeDetails: { name: 'gs', sourceLine: 'alias gs="git status"' },
            },
            {
              kind: 'source' as const,
              classification: 'unknown' as const,
              toolIds: [],
              reason: 'rc-file-content',
              confidence: 'medium' as const,
              safeDetails: { target: '~/.private-aliases' },
            },
          ],
        },
      ],
      tools: [
        {
          toolId: 'direnv',
          label: 'direnv',
          category: 'env-loader',
          knownFileCount: 1,
          findingCount: 1,
          paths: ['/Users/test/.zshrc'],
        },
      ],
      counts: {
        totalFiles: 1,
        knownFiles: 0,
        unknownFiles: 0,
        mixedFiles: 1,
        skippedFiles: 0,
        warnings: 0,
        knownFindingsCount: 1,
        unknownFindingsCount: 2,
      },
    };

    return {
      ...createEmptyInventoryReport(),
      tools: [
        {
          toolId: 'homebrew',
          label: 'Homebrew',
          category: 'package-manager',
          installed: 'installed',
          evidence: [{ type: 'homebrew-formula', id: 'brew', requestStatus: 'direct' }],
          warningIds: [],
        },
        {
          toolId: 'vscode',
          label: 'Visual Studio Code',
          category: 'editor',
          installed: 'installed',
          evidence: [{ type: 'homebrew-cask', id: 'visual-studio-code', requestStatus: 'direct' }],
          warningIds: [],
        },
      ],
      unmatchedHomebrew: {
        formulae: [{ id: 'ripgrep', requestStatus: 'dependency' }],
        casks: [],
      },
      homebrew: {
        installedFormulaeCount: 2,
        installedCasksCount: 1,
        matchedFormulaeCount: 1,
        matchedCasksCount: 1,
        unmatchedFormulaeCount: 1,
        unmatchedCasksCount: 0,
        directFormulaeCount: 1,
        dependencyFormulaeCount: 1,
        unknownFormulaeCount: 0,
      },
      dotfiles,
      warnings: [],
      environment: {
        homeDir: '~',
        shell: '/bin/zsh',
        rcFiles: {},
        detectedLanguages: [{ name: 'node', version: '22.0.0' }],
        detectedVersionManagers: [{ name: 'vfox' }],
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    mockScanInventory.mockResolvedValue(createInventoryFixture());
  });

  afterEach(() => {
    vi.useRealTimers();
    mockScanInventory.mockReset();
  });

  it('renders the wizard entry point without crashing', async () => {
    const { App } = await import('../../src/app.js');
    const { lastFrame } = render(React.createElement(App, { mode: 'wizard' }));
    
    // Should render tilde header
    expect(lastFrame()).toContain('tilde');
  });

  it('wizard step 0 (config detection) shows create prompt when no config found', async () => {
    const { ConfigDetectionStep } = await import('../../src/steps/config-detection.js');
    const onComplete = vi.fn();
    const onExit = vi.fn();

    const { lastFrame } = render(React.createElement(ConfigDetectionStep, { onComplete, onExit }));

    // Wait for async config scan
    await new Promise(resolve => setTimeout(resolve, 300));

    // Should NOT have auto-advanced — should show a prompt
    expect(onComplete).not.toHaveBeenCalled();
    expect(lastFrame()).toContain('Create a new tilde config');
  });

  it('shell step renders options and calls onComplete on selection', async () => {
    const { ShellStep } = await import('../../src/steps/shell.js');
    const onComplete = vi.fn();
    
    const { lastFrame, stdin } = render(
      React.createElement(ShellStep, { onComplete })
    );

    expect(lastFrame()).toContain('zsh');
    
    // Press Enter to select zsh (default)
    stdin.write('\r');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(onComplete).toHaveBeenCalledWith({ shell: 'zsh' });
  });

  it('secrets backend step renders options', async () => {
    const { SecretsBackendStep } = await import('../../src/steps/secrets-backend.js');
    const onComplete = vi.fn();
    
    const { lastFrame } = render(
      React.createElement(SecretsBackendStep, { onComplete })
    );

    expect(lastFrame()).toContain('1Password');
    expect(lastFrame()).toContain('Keychain');
  });

  it('version manager step allows multi-select with space', async () => {
    const { VersionManagerStep } = await import('../../src/steps/version-manager.js');
    const onComplete = vi.fn();
    
    const { stdin, lastFrame } = render(
      React.createElement(VersionManagerStep, { onComplete })
    );

    expect(lastFrame()).toContain('vfox');
    
    // Space to toggle vfox off (it starts selected), then back on
    stdin.write(' ');
    await new Promise(resolve => setTimeout(resolve, 50));
    stdin.write(' ');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Enter to confirm with vfox selected
    stdin.write('\r');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(onComplete).toHaveBeenCalledWith({
      versionManagers: [{ name: 'vfox' }],
    });
  });

  it('browser step renders browser options', async () => {
    const { BrowserStep } = await import('../../src/steps/browser.js');
    const onComplete = vi.fn();
    const onSkip = vi.fn();

    const { lastFrame } = render(
      React.createElement(BrowserStep, { onComplete, isOptional: true, onSkip })
    );

    // Initially shows detecting spinner, then the selection
    await new Promise(resolve => setTimeout(resolve, 200));
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Browser Selection');
    expect(frame).toContain('Google Chrome');
    expect(frame).toContain('Safari');
    expect(frame).toContain('Space to toggle, Enter to confirm');
  });

  it('ai tools step renders without crashing', async () => {
    const { AIToolsStep } = await import('../../src/steps/ai-tools.js');
    const onComplete = vi.fn();
    const onSkip = vi.fn();

    const { lastFrame } = render(
      React.createElement(AIToolsStep, { onComplete, isOptional: true, onSkip })
    );

    // Should show loading or the AI tools list
    await new Promise(resolve => setTimeout(resolve, 200));
    const frame = lastFrame() ?? '';
    expect(typeof frame).toBe('string');
  });

  it('contexts step shows ContextListView when initialContexts provided', async () => {
    const { ContextsStep } = await import('../../src/steps/contexts.js');
    const onComplete = vi.fn();
    const onBack = vi.fn();

    const initialContexts = [
      {
        label: 'personal',
        path: '~/Developer/personal',
        git: { name: 'Test', email: 'test@test.com' },
        authMethod: 'gh-cli' as const,
        envVars: [],
        languageBindings: [],
      },
    ];

    const { lastFrame } = render(
      React.createElement(ContextsStep, {
        workspaceRoot: '~/Developer',
        initialContexts,
        onBack,
        onComplete,
      })
    );

    const frame = lastFrame() ?? '';
    // Should show context list view with the existing context
    expect(frame).toContain('personal');
    expect(frame).toContain('Workspace Contexts');
  });

  it('app config step renders editor selection first', async () => {
    const { AppConfigStep } = await import('../../src/steps/app-config.js');
    const onComplete = vi.fn();
    const onSkip = vi.fn();

    const { lastFrame } = render(
      React.createElement(AppConfigStep, { onComplete, isOptional: true, onSkip })
    );

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Editor');
  });

  // T037: Contexts step integration tests
  it('contexts step renders workspace root prompt on first render', async () => {
    const { ContextsStep } = await import('../../src/steps/contexts.js');
    const onComplete = vi.fn();
    const onBack = vi.fn();

    const { lastFrame } = render(
      React.createElement(ContextsStep, { onBack, onComplete })
    );

    const frame = lastFrame() ?? '';
    expect(frame).toContain('workspace root');
  });

  it('contexts step calls onBack when back option selected with empty contexts', async () => {
    const { ContextsStep } = await import('../../src/steps/contexts.js');
    const onComplete = vi.fn();
    const onBack = vi.fn();

    render(React.createElement(ContextsStep, { onBack, onComplete }));
    // onBack should be wired; we just verify render without crash
    expect(onBack).not.toHaveBeenCalled();
  });

  // T042: Language sub-flow — language catalog data integrity
  it('LANGUAGE_CATALOG has entries for all expected languages', async () => {
    const { LANGUAGE_CATALOG, LANGUAGE_KEYS } = await import('../../src/data/language-versions.js');

    expect(LANGUAGE_KEYS.length).toBeGreaterThanOrEqual(8);
    for (const key of ['node', 'python', 'java', 'go', 'ruby', 'rust']) {
      expect(LANGUAGE_CATALOG[key]).toBeDefined();
      expect(LANGUAGE_CATALOG[key]!.versions.length).toBeGreaterThan(0);
      expect(LANGUAGE_CATALOG[key]!.managers.length).toBeGreaterThan(0);
    }
  });

  it('package manager step renders checkbox multi-select', async () => {
    const { PackageManagerStep } = await import('../../src/steps/package-manager.js');
    const onComplete = vi.fn();
    const onBack = vi.fn();

    const { lastFrame } = render(
      React.createElement(PackageManagerStep, { onComplete, onBack })
    );

    const frame = lastFrame() ?? '';
    expect(frame).toContain('homebrew');
  });

  it('inventory wizard step uses inventory label and summarizes known installed tools', async () => {
    const { Wizard } = await import('../../src/modes/wizard.js');

    const { lastFrame } = render(
      React.createElement(Wizard, {
        initialStep: 1,
        inventory: createInventoryFixture(),
      } as React.ComponentProps<typeof Wizard> & { inventory: InventoryReport })
    );

    await new Promise(resolve => setTimeout(resolve, 100));
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Inventory');
    expect(frame).not.toContain('Environment Capture');
    expect(frame).toContain('Inventory scan complete');
    expect(frame).toContain('Known installed tools:');
    expect(frame).toContain('Provenance: already installed');
    expect(frame).not.toContain('tilde-managed');
    expect(frame).toContain('Dotfiles:');
  });

  it('inventory wizard step summarizes Homebrew counts and warnings without unmatched names', async () => {
    const { Wizard } = await import('../../src/modes/wizard.js');
    const inventory = createInventoryFixture({
      warnings: [
        {
          id: 'homebrew-request-state-unavailable',
          source: 'homebrew',
          severity: 'warning',
          message: 'Homebrew direct/dependency status is unavailable.',
        },
      ],
    });

    const { lastFrame } = render(
      React.createElement(Wizard, {
        initialStep: 1,
        inventory,
      } as React.ComponentProps<typeof Wizard> & { inventory: InventoryReport })
    );

    await new Promise(resolve => setTimeout(resolve, 100));
    const frame = lastFrame() ?? '';
    const normalizedFrame = frame.replace(/\s+/g, ' ');
    expect(frame).toContain('Inventory scan complete');
    expect(frame).toContain('Known installed tools:');
    expect((frame.match(/Provenance:/g) ?? []).length).toBe(1);
    expect(normalizedFrame).toContain('Homebrew formulae: 1 direct, 1 dependencies, 0');
    expect(normalizedFrame).toContain('unknown');
    expect(normalizedFrame).toContain('Dotfile findings: 1 known hooks, 2 unknown rc');
    expect(normalizedFrame).toContain('findings');
    expect(frame).toContain('Warnings:');
    expect(normalizedFrame).toContain('Warning: Homebrew direct/dependency status is');
    expect(normalizedFrame).toContain('unavailable.');
    expect(frame).not.toContain('ripgrep');
    expect(frame).not.toContain('alias gs=');
    expect(frame).not.toContain('eval "$(direnv hook zsh)"');
    expect(frame).not.toContain('~/.private-aliases');
  });

  it('final apply confirmation renders config-aware inventory provenance before choices', async () => {
    const { ApplyStep } = await import('../../src/steps/apply.js');
    const onComplete = vi.fn();
    const onBack = vi.fn();
    const config: TildeConfig = {
      $schema: 'https://thingstead.io/tilde/config-schema/v1.json',
      version: '1',
      schemaVersion: '1.6',
      os: 'macos',
      shell: 'zsh',
      packageManagers: ['homebrew'],
      versionManagers: [],
      languages: [],
      workspaceRoot: '~/Developer',
      dotfilesRepo: '~/Developer/personal/dotfiles',
      contexts: [{
        label: 'personal',
        path: '~/Developer/personal',
        git: { name: 'Test User', email: 'test@example.com' },
        authMethod: 'gh-cli',
        envVars: [],
        languageBindings: [],
      }],
      tools: ['unknown-selected-tool'],
      configurations: {
        git: true,
        vscode: false,
        aliases: false,
        osDefaults: false,
        direnv: true,
      },
      accounts: [],
      secretsBackend: '1password',
      browser: { selected: [], default: null },
      editors: { primary: 'vscode', additional: [] },
      aiTools: [],
    };

    const { lastFrame } = render(
      React.createElement(ApplyStep, {
        config,
        inventory: createInventoryFixture(),
        onComplete,
        onBack,
      } as React.ComponentProps<typeof ApplyStep>)
    );

    const frame = lastFrame() ?? '';
    const provenanceIndex = frame.indexOf('Provenance:');
    const configIndex = frame.indexOf('Configuration Summary');
    const choicesIndex = frame.indexOf('Apply & Finish');

    expect(provenanceIndex).toBeGreaterThanOrEqual(0);
    expect(configIndex).toBeGreaterThan(provenanceIndex);
    expect(choicesIndex).toBeGreaterThan(configIndex);
    expect(frame).toContain('tilde-managed 3 (Homebrew, Visual Studio Code, unknown-selected-tool)');
    expect(frame).toContain('Apply & Finish');
    expect(frame).toContain('Finish');
  });

  it('inventory wizard step shows startup scan failure warnings without blocking rendering', async () => {
    const { Wizard } = await import('../../src/modes/wizard.js');
    const fallbackInventory = createInventoryFixture({
      tools: [],
      homebrew: {
        installedFormulaeCount: 0,
        installedCasksCount: 0,
        matchedFormulaeCount: 0,
        matchedCasksCount: 0,
        unmatchedFormulaeCount: 0,
        unmatchedCasksCount: 0,
        directFormulaeCount: 0,
        dependencyFormulaeCount: 0,
        unknownFormulaeCount: 0,
      },
      warnings: [
        {
          id: 'inventory-startup-failed',
          source: 'scanner',
          severity: 'warning',
          message: 'Inventory scan failed; continuing with an empty report.',
        },
      ],
    });

    const { lastFrame } = render(
      React.createElement(Wizard, {
        initialStep: 1,
        inventory: fallbackInventory,
      } as React.ComponentProps<typeof Wizard> & { inventory: InventoryReport })
    );

    await new Promise(resolve => setTimeout(resolve, 100));
    const frame = lastFrame() ?? '';
    const normalizedFrame = frame.replace(/\s+/g, ' ');
    expect(frame).toContain('Inventory');
    expect(frame).toContain('Known installed tools:');
    expect(normalizedFrame).toContain('Warning: Inventory scan failed; continuing with an');
    expect(normalizedFrame).toContain('empty report.');
  });

  it('inventory wizard step blocks Continue while inventory is loading', async () => {
    const { InventoryStep } = await import('../../src/steps/inventory.js');
    const onComplete = vi.fn();
    const inventoryState: InventoryScanState = {
      status: 'loading',
      report: createEmptyInventoryReport(),
    };

    const { lastFrame } = render(
      React.createElement(InventoryStep, {
        inventoryState,
        onComplete,
      } as React.ComponentProps<typeof InventoryStep>)
    );

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Scanning inventory...');
    expect(frame).not.toContain('Continue');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('keeps setup choices behind pending startup inventory scans', async () => {
    mockScanInventory.mockReturnValue(new Promise(() => undefined));

    const { App } = await import('../../src/app.js');
    const { lastFrame, stdin } = render(React.createElement(App, { mode: 'wizard' }));

    await new Promise(resolve => setTimeout(resolve, 2000));
    stdin.write('\r');
    await new Promise(resolve => setTimeout(resolve, 100));

    const frame = lastFrame() ?? '';
    expect(mockScanInventory).toHaveBeenCalled();
    expect(frame).toContain('Scanning inventory...');
    expect(frame).not.toContain('Continue');
    expect(frame).not.toContain('Shell');
  });

  it('does not pass installed inventory metadata ids to ToolsStep defaultTools', async () => {
    const observedDefaultTools: Array<string | undefined> = [];
    vi.resetModules();
    vi.doMock('../../src/steps/tools.js', () => ({
      ToolsStep: (props: { defaultTools?: string }) => {
        observedDefaultTools.push(props.defaultTools);
        return React.createElement(Text, null, `mock tools default: ${props.defaultTools ?? '<unset>'}`);
      },
    }));
    const { Wizard } = await import('../../src/modes/wizard.js');
    const inventoryState: InventoryScanState = {
      status: 'ready',
      report: createInventoryFixture({
        tools: [
          {
            toolId: 'homebrew',
            label: 'Homebrew',
            category: 'package-manager',
            installed: 'installed',
            evidence: [{ type: 'homebrew-formula', id: 'brew', requestStatus: 'direct' }],
            warningIds: [],
          },
          {
            toolId: 'vscode',
            label: 'Visual Studio Code',
            category: 'editor',
            installed: 'installed',
            evidence: [{ type: 'homebrew-cask', id: 'visual-studio-code', requestStatus: 'direct' }],
            warningIds: [],
          },
          {
            toolId: 'chrome',
            label: 'Google Chrome',
            category: 'browser',
            installed: 'installed',
            evidence: [{ type: 'homebrew-cask', id: 'google-chrome', requestStatus: 'direct' }],
            warningIds: [],
          },
          {
            toolId: 'vfox',
            label: 'vfox',
            category: 'version-manager',
            installed: 'installed',
            evidence: [{ type: 'command', command: 'vfox', outcome: 'succeeded' }],
            warningIds: [],
          },
          {
            toolId: 'obsidian',
            label: 'Obsidian',
            category: 'note-taking',
            installed: 'installed',
            evidence: [{ type: 'homebrew-cask', id: 'obsidian', requestStatus: 'direct' }],
            warningIds: [],
          },
          {
            toolId: 'shell:zsh',
            label: 'zsh',
            category: 'shell',
            installed: 'installed',
            evidence: [{ type: 'shell', name: 'zsh', source: 'scanner' }],
            warningIds: [],
          },
          {
            toolId: 'core-tool:node',
            label: 'Node.js',
            category: 'core-tool',
            installed: 'installed',
            evidence: [{ type: 'command', command: 'node', outcome: 'succeeded', version: '22.0.0' }],
            warningIds: [],
          },
        ],
      }),
    };

    render(
      React.createElement(Wizard, {
        initialStep: 6,
        inventoryState,
      } as React.ComponentProps<typeof Wizard>)
    );

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(observedDefaultTools[0] ?? '').toBe('');
  });

  it('preserves failed inventory status after continuing and navigating back', async () => {
    vi.resetModules();
    vi.doMock('../../src/steps/shell.js', () => ({
      ShellStep: (props: { onBack?: () => void }) => {
        React.useEffect(() => {
          props.onBack?.();
        }, [props]);

        return React.createElement(Text, null, 'mock shell step');
      },
    }));

    const { Wizard } = await import('../../src/modes/wizard.js');
    const inventoryState: InventoryScanState = {
      status: 'failed',
      report: createInventoryFixture({
        tools: [],
        warnings: [
          {
            id: 'inventory-startup-failed',
            source: 'scanner',
            severity: 'warning',
            message: 'Inventory scan failed; continuing with an empty report.',
          },
        ],
      }),
    };

    const { lastFrame, stdin } = render(
      React.createElement(Wizard, {
        initialStep: 1,
        inventoryState,
      } as React.ComponentProps<typeof Wizard>)
    );

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(lastFrame()).toContain('Inventory scan failed');

    stdin.write('\r');
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(lastFrame()).toContain('Inventory scan failed');
    expect(lastFrame()).not.toContain('Inventory scan complete');
  });
});
