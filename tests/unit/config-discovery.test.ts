/**
 * Unit tests for config auto-discovery.
 *
 * Tests the discovery priority order, error messages, and edge cases.
 * Updated for spec 010: async getDiscoveryPaths(), git root detection, ~/.tilde/ path.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'node:path';
import { homedir } from 'node:os';
import {
  formatConfigLoadError,
  resolveConfigPath,
} from '../../src/utils/config-resolution.js';
import type {
  ConfigCommandContext,
  ConfigPathSource,
  ConfigResolutionResult,
  ResolvedConfigPath,
} from '../../src/utils/config-resolution.js';

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

  it('keeps ~/.tilde/tilde.config.json before legacy and user-friendly home paths', async () => {
    mockExeca.mockResolvedValue({ exitCode: 0, stdout: process.cwd() } as never);
    const paths = await getDiscoveryPaths();
    const canonicalHome = join(homedir(), '.tilde', 'tilde.config.json');
    const xdgHome = join(homedir(), '.config', 'tilde', 'tilde.config.json');
    const homeRoot = join(homedir(), 'tilde.config.json');
    expect(paths).toEqual(expect.arrayContaining([canonicalHome, xdgHome, homeRoot]));
    expect(paths.indexOf(canonicalHome)).toBeLessThan(paths.indexOf(xdgHome));
    expect(paths.indexOf(canonicalHome)).toBeLessThan(paths.indexOf(homeRoot));
  });

  it('includes git repo root when it differs from cwd', async () => {
    const fakeGitRoot = '/fake/git/root';
    mockExeca.mockResolvedValue({ exitCode: 0, stdout: fakeGitRoot } as never);
    const paths = await getDiscoveryPaths();
    expect(paths).toContain(join(fakeGitRoot, 'tilde.config.json'));
    expect(paths.length).toBe(5); // cwd + git root + ~/.tilde/ + ~/.config/tilde + ~/
  });

  it('omits git root path when it equals cwd (no duplication)', async () => {
    mockExeca.mockResolvedValue({ exitCode: 0, stdout: process.cwd() } as never);
    const paths = await getDiscoveryPaths();
    const configPaths = paths.filter(p => !p.startsWith(homedir()));
    const cwdPath = join(process.cwd(), 'tilde.config.json');
    expect(configPaths.filter(p => p === cwdPath).length).toBe(1);
    expect(paths.length).toBe(4); // cwd + home candidates (no git root duplicate)
  });

  it('skips git root when not in a git repo (non-zero exit)', async () => {
    mockExeca.mockResolvedValue({ exitCode: 128, stdout: '' } as never);
    const paths = await getDiscoveryPaths();
    expect(paths.length).toBe(4); // cwd + home candidates
    expect(paths[0]).toBe(join(process.cwd(), 'tilde.config.json'));
    expect(paths[1]).toBe(join(homedir(), '.tilde', 'tilde.config.json'));
  });

  it('skips git root when execa throws (git unavailable)', async () => {
    mockExeca.mockRejectedValue(new Error('git not found'));
    const paths = await getDiscoveryPaths();
    expect(paths.length).toBe(4);
  });

  it('paths are in priority order (cwd, git root, canonical home, xdg home, home root)', async () => {
    mockExeca.mockResolvedValue({ exitCode: 0, stdout: '/some/other/root' } as never);
    const paths = await getDiscoveryPaths();
    expect(paths[0]).toBe(join(process.cwd(), 'tilde.config.json'));
    expect(paths[1]).toBe(join('/some/other/root', 'tilde.config.json'));
    expect(paths[2]).toBe(join(homedir(), '.tilde', 'tilde.config.json'));
    expect(paths[3]).toBe(join(homedir(), '.config', 'tilde', 'tilde.config.json'));
    expect(paths[4]).toBe(join(homedir(), 'tilde.config.json'));
  });

  it('includes fixed ~/.config/tilde/tilde.config.json path', async () => {
    mockExeca.mockResolvedValue({ exitCode: 0, stdout: process.cwd() } as never);
    const paths = await getDiscoveryPaths();
    expect(paths).toContain(join(homedir(), '.config', 'tilde', 'tilde.config.json'));
  });

  it('includes fixed ~/tilde.config.json path', async () => {
    mockExeca.mockResolvedValue({ exitCode: 0, stdout: process.cwd() } as never);
    const paths = await getDiscoveryPaths();
    expect(paths).toContain(join(homedir(), 'tilde.config.json'));
  });

  it('uses only fixed path candidates and no broad scan patterns', async () => {
    mockExeca.mockResolvedValue({ exitCode: 0, stdout: '/some/other/root' } as never);
    const paths = await getDiscoveryPaths();
    expect(paths.every(p => p.endsWith('tilde.config.json'))).toBe(true);
    expect(paths.some(p => p.includes('*'))).toBe(false);
    expect(paths.some(p => p.includes('.zshrc'))).toBe(false);
    expect(paths.some(p => p.includes('.bashrc'))).toBe(false);
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
    expect(msg.indexOf('tilde')).toBeLessThan(msg.indexOf('--config'));
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

  it('includes useful example config locations', async () => {
    const msg = await formatNoConfigError('install');
    expect(msg).toContain('~/.tilde/tilde.config.json');
    expect(msg).toContain('~/.config/tilde/tilde.config.json');
    expect(msg).toContain('~/tilde.config.json');
  });

  it.each([
    ['install', 'tilde install --config <path>'],
    ['update shell', 'tilde update <resource> --config <path>'],
    ['config validate', 'tilde config validate --config <path>'],
    ['context list', 'tilde context list --config <path>'],
    ['reconfigure', 'tilde --reconfigure --config <path>'],
  ])('includes command-specific config guidance for %s', async (_name, example) => {
    const context: ConfigCommandContext = { command: _name, configExample: example };
    const msg = await formatNoConfigError(context);
    expect(msg).toContain(example);
  });
});

describe('resolveConfigPath()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the source-aware resolver contract types', () => {
    const source: ConfigPathSource = 'flag';
    const resolved: ResolvedConfigPath = { path: '/tmp/tilde.config.json', source };
    const result: ConfigResolutionResult = { found: true, resolved };
    expect(result.resolved.source).toBe('flag');
  });

  it('uses --config before TILDE_CONFIG, positional paths, or discovery', async () => {
    const result = await resolveConfigPath({
      flagConfigPath: '/flag/tilde.config.json',
      envConfigPath: '/env/tilde.config.json',
      positionalConfigPath: '/positional/tilde.config.json',
      command: { command: 'install', configExample: 'tilde install --config <path>' },
      discoverConfig: vi.fn().mockResolvedValue('/discovered/tilde.config.json'),
    });
    expect(result).toEqual({
      found: true,
      resolved: { path: '/flag/tilde.config.json', source: 'flag' },
    });
  });

  it('uses TILDE_CONFIG before positional paths or discovery', async () => {
    const result = await resolveConfigPath({
      envConfigPath: '/env/tilde.config.json',
      positionalConfigPath: '/positional/tilde.config.json',
      command: { command: 'config validate', configExample: 'tilde config validate --config <path>' },
      discoverConfig: vi.fn().mockResolvedValue('/discovered/tilde.config.json'),
    });
    expect(result).toEqual({
      found: true,
      resolved: { path: '/env/tilde.config.json', source: 'env' },
    });
  });

  it('uses positional paths before discovery', async () => {
    const result = await resolveConfigPath({
      positionalConfigPath: '/positional/tilde.config.json',
      command: { command: 'config validate', configExample: 'tilde config validate --config <path>' },
      discoverConfig: vi.fn().mockResolvedValue('/discovered/tilde.config.json'),
    });
    expect(result).toEqual({
      found: true,
      resolved: { path: '/positional/tilde.config.json', source: 'positional' },
    });
  });

  it('uses first accessible auto-discovered path only when no explicit source exists', async () => {
    const discover = vi.fn().mockResolvedValue('/discovered/tilde.config.json');
    const result = await resolveConfigPath({
      command: { command: 'install', configExample: 'tilde install --config <path>' },
      discoverConfig: discover,
    });
    expect(discover).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      found: true,
      resolved: { path: '/discovered/tilde.config.json', source: 'discovered' },
    });
  });

  it('does not call discovery when an explicit path is present', async () => {
    const discover = vi.fn().mockResolvedValue('/discovered/tilde.config.json');
    await resolveConfigPath({
      flagConfigPath: '/missing/tilde.config.json',
      command: { command: 'install', configExample: 'tilde install --config <path>' },
      discoverConfig: discover,
    });
    expect(discover).not.toHaveBeenCalled();
  });

  it('returns shared no-config guidance when no source can resolve', async () => {
    mockExeca.mockResolvedValue({ exitCode: 0, stdout: process.cwd() } as never);
    const result = await resolveConfigPath({
      command: { command: 'install', configExample: 'tilde install --config <path>' },
      discoverConfig: vi.fn().mockResolvedValue(null),
    });
    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.message).toContain('Searched:');
      expect(result.message).toContain('tilde install --config <path>');
    }
  });
});

describe('formatConfigLoadError()', () => {
  it('formats missing --config paths without discovery fallback language', () => {
    const msg = formatConfigLoadError(
      { path: '/missing/tilde.config.json', source: 'flag' },
      Object.assign(new Error('not found'), { code: 'ENOENT' }),
      { command: 'install', configExample: 'tilde install --config <path>' }
    );
    expect(msg).toContain('--config');
    expect(msg).toContain('/missing/tilde.config.json');
    expect(msg).toContain('No auto-discovery fallback was attempted');
    expect(msg).not.toContain('Searched:');
  });

  it('formats missing TILDE_CONFIG paths with fix-or-unset guidance', () => {
    const msg = formatConfigLoadError(
      { path: '/missing/env-config.json', source: 'env' },
      Object.assign(new Error('not found'), { code: 'ENOENT' }),
      { command: 'install', configExample: 'tilde install --config <path>' }
    );
    expect(msg).toContain('TILDE_CONFIG is set');
    expect(msg).toContain('fix or unset TILDE_CONFIG');
    expect(msg).not.toContain('Searched:');
  });

  it('formats invalid selected files without searched-path alternatives', () => {
    const msg = formatConfigLoadError(
      { path: '/selected/tilde.config.json', source: 'flag' },
      new Error('Failed to parse config as JSON: Unexpected token'),
      { command: 'config validate', configExample: 'tilde config validate --config <path>' }
    );
    expect(msg).toContain('/selected/tilde.config.json');
    expect(msg).toContain('Failed to parse config as JSON');
    expect(msg).not.toContain('Searched:');
  });
});
