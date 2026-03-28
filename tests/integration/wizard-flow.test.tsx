import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

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
  it('renders the wizard entry point without crashing', async () => {
    const { App } = await import('../../src/app.js');
    const { lastFrame } = render(React.createElement(App, { mode: 'wizard' }));
    
    // Should render tilde header
    expect(lastFrame()).toContain('tilde');
  });

  it('wizard step 0 (config detection) auto-advances when no config found', async () => {
    const { ConfigDetectionStep } = await import('../../src/steps/00-config-detection.js');
    const onComplete = vi.fn();
    
    render(React.createElement(ConfigDetectionStep, { onComplete }));

    // Wait for async config scan
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should have called onComplete with wizard mode
    expect(onComplete).toHaveBeenCalledWith({ mode: 'wizard' });
  });

  it('shell step renders options and calls onComplete on selection', async () => {
    const { ShellStep } = await import('../../src/steps/02-shell.js');
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
    const { SecretsBackendStep } = await import('../../src/steps/12-secrets-backend.js');
    const onComplete = vi.fn();
    
    const { lastFrame } = render(
      React.createElement(SecretsBackendStep, { onComplete })
    );

    expect(lastFrame()).toContain('1Password');
    expect(lastFrame()).toContain('Keychain');
  });

  it('version manager step allows multi-select with space', async () => {
    const { VersionManagerStep } = await import('../../src/steps/04-version-manager.js');
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
});
