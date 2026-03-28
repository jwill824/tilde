import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SecretsBackendPlugin } from '../../src/plugins/api.js';

vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({
    stdout: JSON.stringify([{ email: 'test@example.com' }]),
    stderr: '',
    exitCode: 0,
  }),
  ExecaError: class ExecaError extends Error {
    stderr = '';
    exitCode = 1;
  },
}));

let plugin: SecretsBackendPlugin;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('../../src/plugins/first-party/onepassword/index.js');
  plugin = mod.default;
});

describe('SecretsBackendPlugin contract', () => {
  it('has required interface properties', () => {
    expect(plugin.id).toBeDefined();
    expect(plugin.category).toBe('secrets-backend');
    expect(plugin.source).toMatch(/^(first-party|community|local)$/);
  });

  it('has all required methods', () => {
    expect(typeof plugin.isAvailable).toBe('function');
    expect(typeof plugin.generateReference).toBe('function');
    expect(typeof plugin.validate).toBe('function');
  });

  it('generateReference returns a reference string, never a resolved value', () => {
    const ref = plugin.generateReference({ vault: 'Personal', item: 'GitHub', field: 'token' });
    expect(typeof ref).toBe('string');
    expect(ref.length).toBeGreaterThan(0);
    // Must NOT look like a raw secret
    expect(ref).not.toMatch(/^ghp_/);
    expect(ref).not.toMatch(/^sk-/);
    expect(ref).not.toMatch(/^AKIA/);
    expect(ref).not.toMatch(/^xox[bp]-/);
  });

  it('generateReference uses op:// format for 1password', () => {
    const ref = plugin.generateReference({ item: 'MyItem', field: 'password' });
    expect(ref).toMatch(/^op:\/\//);
  });

  it('generateReference with different vault produces different reference', () => {
    const ref1 = plugin.generateReference({ vault: 'Personal', item: 'Item', field: 'field' });
    const ref2 = plugin.generateReference({ vault: 'Work', item: 'Item', field: 'field' });
    expect(ref1).not.toBe(ref2);
  });

  it('validate returns { valid: boolean } shape', async () => {
    const result = await plugin.validate();
    expect(result).toHaveProperty('valid');
    expect(typeof result.valid).toBe('boolean');
  });
});
