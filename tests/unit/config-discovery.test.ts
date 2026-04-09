/**
 * Unit tests for config auto-discovery.
 *
 * Tests the discovery priority order, error messages, and edge cases.
 * Updated for spec 010: async getDiscoveryPaths(), git root detection, ~/.tilde/ path.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'node:path';
import { homedir } from 'node:os';

// Mock execa to control git root detection in unit tests
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

import { execa } from 'execa';
import { getDiscoveryPaths, formatNoConfigError } from '../../src/utils/config-discovery.js';

const mockExeca = vi.mocked(execa);

describe('getDiscoveryPaths()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('first path is ./tilde.config.json in current working directory', async () => {
    mockExeca.mockResolvedValue({ exitCode: 0, stdout: process.cwd() } as never);
    const paths = await getDiscoveryPaths();
    expect(paths[0]).toBe(join(process.cwd(), 'tilde.config.json'));
  });

  it('last path is ~/.tilde/tilde.config.json (canonical home)', async () => {
    mockExeca.mockResolvedValue({ exitCode: 0, stdout: process.cwd() } as never);
    const paths = await getDiscoveryPaths();
    expect(paths[paths.length - 1]).toBe(join(homedir(), '.tilde', 'tilde.config.json'));
  });

  it('includes git repo root when it differs from cwd', async () => {
    const fakeGitRoot = '/fake/git/root';
    mockExeca.mockResolvedValue({ exitCode: 0, stdout: fakeGitRoot } as never);
    const paths = await getDiscoveryPaths();
    expect(paths).toContain(join(fakeGitRoot, 'tilde.config.json'));
    expect(paths.length).toBe(3); // cwd + git root + ~/.tilde/
  });

  it('omits git root path when it equals cwd (no duplication)', async () => {
    mockExeca.mockResolvedValue({ exitCode: 0, stdout: process.cwd() } as never);
    const paths = await getDiscoveryPaths();
    const configPaths = paths.filter(p => p !== join(homedir(), '.tilde', 'tilde.config.json'));
    const cwdPath = join(process.cwd(), 'tilde.config.json');
    expect(configPaths.filter(p => p === cwdPath).length).toBe(1);
    expect(paths.length).toBe(2); // cwd + ~/.tilde/ (no git root duplicate)
  });

  it('skips git root when not in a git repo (non-zero exit)', async () => {
    mockExeca.mockResolvedValue({ exitCode: 128, stdout: '' } as never);
    const paths = await getDiscoveryPaths();
    expect(paths.length).toBe(2); // cwd + ~/.tilde/
    expect(paths[0]).toBe(join(process.cwd(), 'tilde.config.json'));
    expect(paths[1]).toBe(join(homedir(), '.tilde', 'tilde.config.json'));
  });

  it('skips git root when execa throws (git unavailable)', async () => {
    mockExeca.mockRejectedValue(new Error('git not found'));
    const paths = await getDiscoveryPaths();
    expect(paths.length).toBe(2);
  });

  it('paths are in priority order (cwd first, ~/.tilde last)', async () => {
    mockExeca.mockResolvedValue({ exitCode: 0, stdout: '/some/other/root' } as never);
    const paths = await getDiscoveryPaths();
    expect(paths[0]).toBe(join(process.cwd(), 'tilde.config.json'));
    expect(paths[paths.length - 1]).toBe(join(homedir(), '.tilde', 'tilde.config.json'));
  });

  it('does NOT include old ~/.config/tilde/ path', async () => {
    mockExeca.mockResolvedValue({ exitCode: 0, stdout: process.cwd() } as never);
    const paths = await getDiscoveryPaths();
    expect(paths.every(p => !p.includes('.config/tilde'))).toBe(true);
  });

  it('does NOT include old ~/tilde.config.json path', async () => {
    mockExeca.mockResolvedValue({ exitCode: 0, stdout: process.cwd() } as never);
    const paths = await getDiscoveryPaths();
    expect(paths.every(p => p !== join(homedir(), 'tilde.config.json'))).toBe(true);
  });
});

describe('discoverConfig()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExeca.mockResolvedValue({ exitCode: 0, stdout: process.cwd() } as never);
  });

  it('returns null or a string path (smoke test)', async () => {
    const { discoverConfig } = await import('../../src/utils/config-discovery.js');
    const result = await discoverConfig();
    expect(result === null || typeof result === 'string').toBe(true);
  });

  it('first path searched is cwd', async () => {
    const paths = await getDiscoveryPaths();
    expect(paths[0].startsWith(process.cwd())).toBe(true);
  });
});

describe('formatNoConfigError()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExeca.mockResolvedValue({ exitCode: 0, stdout: process.cwd() } as never);
  });

  it('includes the command name in the error', async () => {
    const msg = await formatNoConfigError('install');
    expect(msg).toContain('install');
  });

  it('lists ~/.tilde/tilde.config.json as a search path', async () => {
    const msg = await formatNoConfigError('install');
    expect(msg).toContain(join(homedir(), '.tilde', 'tilde.config.json'));
  });

  it('includes actionable guidance (run the wizard, specify path)', async () => {
    const msg = await formatNoConfigError('install');
    expect(msg).toContain('tilde');
    expect(msg).toContain('--config');
  });

  it('does not mention the wizard launching automatically', async () => {
    const msg = await formatNoConfigError('install');
    expect(msg).not.toContain('Launching wizard');
    expect(msg).not.toContain('Starting wizard');
  });

  it('lists all discovery paths in the message', async () => {
    const paths = await getDiscoveryPaths();
    const msg = await formatNoConfigError('install');
    for (const p of paths) {
      expect(msg).toContain(p);
    }
  });
});
