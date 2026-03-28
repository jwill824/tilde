import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock execa before importing the module under test
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

import { execa } from 'execa';
import {
  detectOsVersion,
  detectOsName,
  detectShellName,
  detectShellVersion,
  captureEnvironment,
} from '../../../src/utils/environment.js';

const mockExeca = vi.mocked(execa);

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('detectOsVersion()', () => {
  it('returns trimmed string from sw_vers -productVersion output', async () => {
    mockExeca.mockResolvedValueOnce({ stdout: '14.5\n' } as ReturnType<typeof execa>);
    const version = await detectOsVersion();
    expect(version).toBe('14.5');
  });

  it('returns "unknown" when execa throws', async () => {
    mockExeca.mockRejectedValueOnce(new Error('command not found'));
    const version = await detectOsVersion();
    expect(version).toBe('unknown');
  });

  it('returns "unknown" when stdout is empty', async () => {
    mockExeca.mockResolvedValueOnce({ stdout: '' } as ReturnType<typeof execa>);
    const version = await detectOsVersion();
    expect(version).toBe('unknown');
  });
});

describe('detectOsName()', () => {
  it('maps major version 13 → Ventura', () => {
    expect(detectOsName('13.6.1')).toBe('macOS Ventura');
  });

  it('maps major version 14 → Sonoma', () => {
    expect(detectOsName('14.5')).toBe('macOS Sonoma');
  });

  it('maps major version 15 → Sequoia', () => {
    expect(detectOsName('15.0')).toBe('macOS Sequoia');
  });

  it('falls back to "macOS {version}" for unmapped versions (e.g., 16)', () => {
    expect(detectOsName('16.0')).toBe('macOS 16.0');
  });

  it('falls back for unknown string', () => {
    expect(detectOsName('unknown')).toBe('macOS unknown');
  });
});

describe('detectShellName()', () => {
  it('returns basename of $SHELL env var', () => {
    const original = process.env['SHELL'];
    process.env['SHELL'] = '/bin/zsh';
    expect(detectShellName()).toBe('zsh');
    if (original === undefined) {
      delete process.env['SHELL'];
    } else {
      process.env['SHELL'] = original;
    }
  });

  it('returns "unknown" when $SHELL is not set', () => {
    const original = process.env['SHELL'];
    delete process.env['SHELL'];
    expect(detectShellName()).toBe('unknown');
    if (original !== undefined) {
      process.env['SHELL'] = original;
    }
  });
});

describe('detectShellVersion()', () => {
  it('parses zsh --version first-line format', async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: 'zsh 5.9 (x86_64-apple-darwin22.0)',
    } as ReturnType<typeof execa>);
    const version = await detectShellVersion('/bin/zsh');
    expect(version).toBe('5.9');
  });

  it('parses bash --version first-line format', async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: 'GNU bash, version 5.2.15(1)-release (arm-apple-darwin22.1.0)',
    } as ReturnType<typeof execa>);
    const version = await detectShellVersion('/bin/bash');
    expect(version).toBe('5.2.15');
  });

  it('parses fish --version output', async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: 'fish, version 3.7.0',
    } as ReturnType<typeof execa>);
    const version = await detectShellVersion('/usr/local/bin/fish');
    expect(version).toBe('3.7.0');
  });

  it('returns undefined when execa throws', async () => {
    mockExeca.mockRejectedValueOnce(new Error('command not found'));
    const version = await detectShellVersion('/bin/unknown-shell');
    expect(version).toBeUndefined();
  });

  it('returns undefined when no version number found in output', async () => {
    mockExeca.mockResolvedValueOnce({
      stdout: 'some shell with no version',
    } as ReturnType<typeof execa>);
    const version = await detectShellVersion('/bin/weird-shell');
    expect(version).toBeUndefined();
  });
});

describe('captureEnvironment()', () => {
  it('completes within 500 ms wall time (FR-006, SC-002)', async () => {
    mockExeca.mockResolvedValue({
      stdout: '14.5',
    } as ReturnType<typeof execa>);
    const start = Date.now();
    await captureEnvironment('1.0.0');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
  });

  it('returns a complete EnvironmentSnapshot', async () => {
    mockExeca
      .mockResolvedValueOnce({ stdout: '14.5\n' } as ReturnType<typeof execa>)
      .mockResolvedValueOnce({ stdout: 'zsh 5.9 (apple)' } as ReturnType<typeof execa>);
    const original = process.env['SHELL'];
    process.env['SHELL'] = '/bin/zsh';

    const snapshot = await captureEnvironment('1.2.3');

    expect(snapshot.os).toContain('Sonoma');
    expect(snapshot.shellName).toBe('zsh');
    expect(snapshot.tildeVersion).toBe('1.2.3');
    expect(snapshot).toHaveProperty('arch');

    if (original === undefined) {
      delete process.env['SHELL'];
    } else {
      process.env['SHELL'] = original;
    }
  });
});
