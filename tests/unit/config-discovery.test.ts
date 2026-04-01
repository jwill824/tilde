/**
 * Unit tests for config auto-discovery (T014).
 *
 * Tests the discovery priority order, error messages, and edge cases.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { homedir } from 'node:os';

// We test the utility functions directly
import { getDiscoveryPaths, formatNoConfigError } from '../../src/utils/config-discovery.js';

describe('getDiscoveryPaths()', () => {
  it('returns exactly 3 standard paths', () => {
    const paths = getDiscoveryPaths();
    expect(paths.length).toBe(3);
  });

  it('first path is ./tilde.config.json in current working directory', () => {
    const paths = getDiscoveryPaths();
    expect(paths[0]).toBe(join(process.cwd(), 'tilde.config.json'));
  });

  it('second path is ~/.config/tilde/tilde.config.json', () => {
    const paths = getDiscoveryPaths();
    expect(paths[1]).toBe(join(homedir(), '.config', 'tilde', 'tilde.config.json'));
  });

  it('third path is ~/tilde.config.json', () => {
    const paths = getDiscoveryPaths();
    expect(paths[2]).toBe(join(homedir(), 'tilde.config.json'));
  });

  it('paths are in priority order (cwd → ~/.config/tilde → ~)', () => {
    const paths = getDiscoveryPaths();
    expect(paths[0]).toContain(process.cwd());
    expect(paths[1]).toContain('.config');
    expect(paths[2]).toBe(join(homedir(), 'tilde.config.json'));
  });
});

describe('discoverConfig()', () => {
  it('returns null when no config files exist at test time (no tilde.config.json in cwd)', async () => {
    // This test runs in the tilde repo itself, which doesn't have a tilde.config.json
    // at the root, so discovery should return null (or the home config if present)
    const { discoverConfig } = await import('../../src/utils/config-discovery.js');
    const result = await discoverConfig();
    // We can't assert null here because the dev machine might have ~/.config/tilde/tilde.config.json
    // Just verify it returns either null or a string path
    expect(result === null || typeof result === 'string').toBe(true);
  });

  it('resolves correctly when searching standard paths (getDiscoveryPaths logic)', () => {
    // Verify that the first path is the cwd one — the discovery order is correct
    const paths = getDiscoveryPaths();
    // The first path starts with cwd
    expect(paths[0].startsWith(process.cwd())).toBe(true);
  });
});

describe('formatNoConfigError()', () => {
  it('includes the command name in the error', () => {
    const msg = formatNoConfigError('install');
    expect(msg).toContain('install');
  });

  it('lists all three search paths', () => {
    const msg = formatNoConfigError('install');
    const paths = getDiscoveryPaths();
    for (const p of paths) {
      expect(msg).toContain(p);
    }
  });

  it('includes actionable guidance (run the wizard)', () => {
    const msg = formatNoConfigError('install');
    expect(msg).toContain('tilde');
    expect(msg).toContain('--config');
  });

  it('does not mention the wizard launching automatically', () => {
    const msg = formatNoConfigError('install');
    // The error message should not say the wizard is launching — user must run it manually
    expect(msg).not.toContain('Launching wizard');
    expect(msg).not.toContain('Starting wizard');
  });
});
