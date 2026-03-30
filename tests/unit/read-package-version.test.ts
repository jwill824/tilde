import { describe, it, expect, vi, beforeEach } from 'vitest';

// Control flag — toggled per test case
let mockShouldThrow = false;

// vi.mock is hoisted before all imports, intercepting node:fs at module level
vi.mock('node:fs', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs')>();
  return {
    ...original,
    readFileSync: vi.fn().mockImplementation((...args: unknown[]) => {
      const path = args[0];
      if (mockShouldThrow && typeof path === 'string' && path.endsWith('package.json')) {
        throw new Error('ENOENT: no such file or directory');
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (original.readFileSync as any)(...args);
    }),
  };
});

describe('readPackageVersion', () => {
  beforeEach(() => {
    mockShouldThrow = false;
  });

  it('normal case — returns version matching package.json', async () => {
    const { readPackageVersion } = await import('../../src/index.js');
    const result = readPackageVersion();

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('unknown');
    // Should be a semver-like string (e.g. "1.2.0")
    expect(result).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('fallback case — returns "unknown" when readFileSync throws', async () => {
    mockShouldThrow = true;
    const { readPackageVersion } = await import('../../src/index.js');
    // Call the function directly (not the cached VERSION constant)
    const result = readPackageVersion();

    expect(result).toBe('unknown');
  });
});
