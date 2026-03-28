import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VersionManagerPlugin } from '../../src/plugins/api.js';

export function runVersionManagerContractTests(
  getPlugin: () => VersionManagerPlugin,
  mockExec: () => void
) {
  describe('VersionManagerPlugin contract', () => {
    beforeEach(() => {
      mockExec();
    });

    it('has required interface properties', () => {
      const plugin = getPlugin();
      expect(plugin.id).toBeDefined();
      expect(typeof plugin.id).toBe('string');
      expect(plugin.name).toBeDefined();
      expect(plugin.category).toBe('version-manager');
      expect(plugin.source).toMatch(/^(first-party|community|local)$/);
      expect(Array.isArray(plugin.supportedPlatforms)).toBe(true);
      expect(Array.isArray(plugin.supportedLanguages)).toBe(true);
    });

    it('has all required methods', () => {
      const plugin = getPlugin();
      expect(typeof plugin.isAvailable).toBe('function');
      expect(typeof plugin.install).toBe('function');
      expect(typeof plugin.installVersion).toBe('function');
      expect(typeof plugin.useVersion).toBe('function');
      expect(typeof plugin.listInstalled).toBe('function');
      expect(typeof plugin.generateShellHook).toBe('function');
    });

    it('isAvailable returns boolean', async () => {
      const plugin = getPlugin();
      const result = await plugin.isAvailable();
      expect(typeof result).toBe('boolean');
    });

    it('installVersion is callable and returns correct shape', async () => {
      const plugin = getPlugin();
      const result = await plugin.installVersion('node', '20.0.0');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('alreadyInstalled');
      expect(typeof result.version).toBe('string');
      expect(typeof result.alreadyInstalled).toBe('boolean');
    });

    it('listInstalled returns array of strings', async () => {
      const plugin = getPlugin();
      const result = await plugin.listInstalled('node');
      expect(Array.isArray(result)).toBe(true);
      result.forEach(v => expect(typeof v).toBe('string'));
    });

    it('generateShellHook returns non-empty string for zsh', () => {
      const plugin = getPlugin();
      const hook = plugin.generateShellHook('zsh');
      expect(typeof hook).toBe('string');
      expect(hook.length).toBeGreaterThan(0);
    });

    it('generateShellHook returns non-empty string for bash', () => {
      const plugin = getPlugin();
      const hook = plugin.generateShellHook('bash');
      expect(typeof hook).toBe('string');
      expect(hook.length).toBeGreaterThan(0);
    });

    it('generateShellHook returns non-empty string for fish', () => {
      const plugin = getPlugin();
      const hook = plugin.generateShellHook('fish');
      expect(typeof hook).toBe('string');
      expect(hook.length).toBeGreaterThan(0);
    });
  });
}
