import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AccountConnectorPlugin } from '../../src/plugins/api.js';

vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
  ExecaError: class ExecaError extends Error {
    stderr = '';
    exitCode = 1;
  },
}));

let plugin: AccountConnectorPlugin;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('../../src/plugins/first-party/gh-cli/index.js');
  plugin = mod.default;
});

describe('AccountConnectorPlugin contract', () => {
  it('has required interface properties', () => {
    expect(plugin.id).toBeDefined();
    expect(plugin.category).toBe('account-connector');
    expect(plugin.platform).toBeDefined();
    expect(typeof plugin.platform).toBe('string');
  });

  it('has all required methods', () => {
    expect(typeof plugin.isAvailable).toBe('function');
    expect(typeof plugin.connect).toBe('function');
    expect(typeof plugin.switchAccount).toBe('function');
    expect(typeof plugin.currentAccount).toBe('function');
    expect(typeof plugin.generateShellHook).toBe('function');
  });

  it('generateShellHook returns a string', () => {
    const hook = plugin.generateShellHook([
      { path: '~/Developer/personal', username: 'alice' },
    ]);
    expect(typeof hook).toBe('string');
    expect(hook.length).toBeGreaterThan(0);
  });

  it('generateShellHook contains correct path patterns for each context', () => {
    const contexts = [
      { path: '~/Developer/personal', username: 'alice' },
      { path: '~/Developer/work', username: 'bob' },
    ];
    const hook = plugin.generateShellHook(contexts);
    expect(hook).toContain('alice');
    expect(hook).toContain('bob');
    expect(hook).toContain('Developer/personal');
    expect(hook).toContain('Developer/work');
  });

  it('generateShellHook uses gh auth switch', () => {
    const hook = plugin.generateShellHook([
      { path: '~/Developer/personal', username: 'alice' },
    ]);
    expect(hook).toContain('gh auth switch');
  });
});
