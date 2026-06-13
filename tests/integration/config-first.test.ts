import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEmptyInventoryReport, type InventoryReport } from '../../src/inventory/report.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturePath = join(__dirname, '../fixtures/tilde.config.json');

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

describe('ConfigFirstMode integration', () => {
  function createInventoryFixture(): InventoryReport {
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
      ],
      unmatchedHomebrew: {
        formulae: [{ name: 'ripgrep', requestStatus: 'dependency' }],
        casks: [],
      },
      homebrew: {
        installedFormulaeCount: 2,
        installedCasksCount: 0,
        matchedFormulaeCount: 1,
        matchedCasksCount: 0,
        unmatchedFormulaeCount: 1,
        unmatchedCasksCount: 0,
        directFormulaeCount: 1,
        dependencyFormulaeCount: 1,
        unknownFormulaeCount: 0,
      },
      warnings: [
        {
          id: 'homebrew-request-state-unavailable',
          source: 'homebrew',
          severity: 'warning',
          message: 'Homebrew direct/dependency status is unavailable.',
        },
      ],
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ConfigSummary content from fixture config', async () => {
    const { ConfigFirstMode } = await import('../../src/modes/config-first.js');
    const onComplete = vi.fn();
    const { lastFrame } = render(
      React.createElement(ConfigFirstMode, { configPath: fixturePath, onComplete })
    );

    await new Promise((r) => setTimeout(r, 300));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Configuration Summary');
    expect(frame).toContain('personal');
    expect(frame).toContain('test@example.com');
    expect(frame).toContain('zsh');
    expect(frame).toContain('homebrew');
    expect(frame).toContain('1password');
  });

  it('shows Apply and Cancel options after loading valid config', async () => {
    const { ConfigFirstMode } = await import('../../src/modes/config-first.js');
    const onComplete = vi.fn();
    const { lastFrame } = render(
      React.createElement(ConfigFirstMode, { configPath: fixturePath, onComplete })
    );

    await new Promise((r) => setTimeout(r, 300));

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Apply this configuration');
    expect(frame).toContain('Cancel');
  });

  it('renders inventory summary before configuration summary', async () => {
    const { ConfigFirstMode } = await import('../../src/modes/config-first.js');
    const onComplete = vi.fn();
    const inventory = createInventoryFixture();
    const { lastFrame } = render(
      React.createElement(ConfigFirstMode, { configPath: fixturePath, onComplete, inventory })
    );

    await new Promise((r) => setTimeout(r, 300));

    const frame = lastFrame() ?? '';
    const inventoryIndex = frame.indexOf('Inventory scan complete');
    const configIndex = frame.indexOf('Configuration Summary');
    expect(inventoryIndex).toBeGreaterThanOrEqual(0);
    expect(configIndex).toBeGreaterThanOrEqual(0);
    expect(inventoryIndex).toBeLessThan(configIndex);
    expect(frame).toContain('Known installed tools: Homebrew');
    expect(frame).toContain('Homebrew formulae: 1 direct, 1 dependencies, 0 unknown');
    expect(frame).toContain('Warnings:');
    expect(frame).toContain('Warning: Homebrew direct/dependency status is unavailable.');
    expect(frame).not.toContain('ripgrep');
  });

  it('calls installAll and writeAll after confirm selection', async () => {
    const { installAll } = await import('../../src/installer/index.js');
    const { writeAll } = await import('../../src/dotfiles/writer.js');
    const { ConfigFirstMode } = await import('../../src/modes/config-first.js');

    const onComplete = vi.fn();
    const { stdin } = render(
      React.createElement(ConfigFirstMode, { configPath: fixturePath, onComplete })
    );

    // Wait for config to load and confirm prompt to appear
    await new Promise((r) => setTimeout(r, 300));

    // Press Enter to select "Apply this configuration" (default / first item)
    stdin.write('\r');
    await new Promise((r) => setTimeout(r, 300));

    expect(installAll).toHaveBeenCalled();
    expect(writeAll).toHaveBeenCalled();
  });

  it('calls onComplete when cancel is selected', async () => {
    const { ConfigFirstMode } = await import('../../src/modes/config-first.js');
    const onComplete = vi.fn();
    const { stdin } = render(
      React.createElement(ConfigFirstMode, { configPath: fixturePath, onComplete })
    );

    await new Promise((r) => setTimeout(r, 300));

    // Arrow down to Cancel, then Enter
    stdin.write('\x1b[B');
    await new Promise((r) => setTimeout(r, 50));
    stdin.write('\r');
    await new Promise((r) => setTimeout(r, 100));

    expect(onComplete).toHaveBeenCalled();
  });
});
