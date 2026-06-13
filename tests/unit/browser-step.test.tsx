import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'ink-testing-library';
import type { ToolMetadata } from '../../src/tools/metadata.js';

const waitForEffects = () => new Promise(resolve => setTimeout(resolve, 75));

const installCask = vi.fn().mockResolvedValue(undefined);
const execa = vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });
const access = vi.fn().mockRejectedValue(new Error('ENOENT'));

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  installCask.mockClear();
  execa.mockClear();
  access.mockReset();
  access.mockRejectedValue(new Error('ENOENT'));
});

function mockCommandBoundaries() {
  vi.doMock('node:fs/promises', async () => {
    const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
    return {
      ...actual,
      access,
    };
  });
  vi.doMock('../../src/utils/package-manager.js', () => ({
    installCask,
  }));
  vi.doMock('execa', () => ({
    execa,
  }));
}

async function importBrowserStep() {
  const { BrowserStep } = await import('../../src/steps/browser.js');
  return BrowserStep;
}

describe('BrowserStep registry integration', () => {
  it('renders browser labels from registry metadata', async () => {
    mockCommandBoundaries();
    const registryBrowser: ToolMetadata = {
      id: 'registry-test-browser',
      label: 'Registry Test Browser',
      category: 'browser',
      supportedPlatforms: ['darwin'],
      source: 'first-party',
      install: {
        appPath: '/Applications/Registry Test Browser.app',
        homebrew: {
          cask: 'registry-test-browser',
        },
      },
      externalIds: {
        defaultbrowser: 'registry-test-browser',
      },
    };
    vi.doMock('../../src/tools/registry.js', () => ({
      getToolsByCategory: vi.fn().mockReturnValue([registryBrowser]),
    }));
    const BrowserStep = await importBrowserStep();

    const { lastFrame } = render(React.createElement(BrowserStep, { onComplete: vi.fn() }));
    await waitForEffects();

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Registry Test Browser');
    expect(frame).not.toContain('Google Chrome');
  });

  it('renders unchecked not-installed rows from browser metadata', async () => {
    mockCommandBoundaries();
    const BrowserStep = await importBrowserStep();

    const { lastFrame } = render(React.createElement(BrowserStep, { onComplete: vi.fn() }));
    await waitForEffects();

    const frame = lastFrame() ?? '';
    expect(frame).toContain('[ ] Safari');
    expect(frame).toContain('[ ] Google Chrome');
    expect(frame).toContain('(not installed)');
  });

  it('completes with no browser selections when no default change is chosen', async () => {
    mockCommandBoundaries();
    const onComplete = vi.fn();
    const BrowserStep = await importBrowserStep();

    const { stdin } = render(React.createElement(BrowserStep, { onComplete }));
    await waitForEffects();
    stdin.write('\r');
    await waitForEffects();
    stdin.write('\r');
    await waitForEffects();

    expect(onComplete).toHaveBeenCalledWith({
      browser: {
        selected: [],
        default: null,
      },
    });
    expect(execa).not.toHaveBeenCalled();
  });

  it('installs a selected registry browser through the package-manager boundary', async () => {
    mockCommandBoundaries();
    const BrowserStep = await importBrowserStep();

    const { stdin } = render(React.createElement(BrowserStep, { onComplete: vi.fn() }));
    await waitForEffects();
    stdin.write('\u001B[B');
    await waitForEffects();
    stdin.write(' ');
    await waitForEffects();
    stdin.write('\r');
    await waitForEffects();

    expect(installCask).toHaveBeenCalledWith('google-chrome');
    expect(execa).not.toHaveBeenCalled();
  });
});
