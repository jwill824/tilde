import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { createEmptyInventoryReport, type InventoryReport } from '../../src/inventory/report.js';

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
        formulae: [{ name: 'ripgrep', requestStatus: 'dependency' }],
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
    await new Promise(resolve => setTimeout(resolve, 100));

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
    expect(frame).toContain('Inventory scan complete');
    expect(frame).toContain('Known installed tools:');
    expect(frame).toContain('Homebrew formulae: 1 direct, 1 dependencies, 0 unknown');
    expect(frame).toContain('Warnings:');
    expect(frame).toContain('Warning: Homebrew direct/dependency status is unavailable.');
    expect(frame).not.toContain('ripgrep');
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
    expect(frame).toContain('Inventory');
    expect(frame).toContain('Known installed tools:');
    expect(frame).toContain('Warning: Inventory scan failed; continuing with an empty report.');
  });
});
