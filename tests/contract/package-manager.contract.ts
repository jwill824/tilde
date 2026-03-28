import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PackageManagerPlugin } from '../../src/plugins/api.js';

export function runPackageManagerContractTests(
  getPlugin: () => PackageManagerPlugin,
  mockExec: () => void
) {
  describe('PackageManagerPlugin contract', () => {
    beforeEach(() => {
      mockExec();
    });

    it('has required interface properties', () => {
      const plugin = getPlugin();
      expect(plugin.id).toBeDefined();
      expect(typeof plugin.id).toBe('string');
      expect(plugin.name).toBeDefined();
      expect(plugin.category).toBe('package-manager');
      expect(plugin.source).toMatch(/^(first-party|community|local)$/);
      expect(Array.isArray(plugin.supportedPlatforms)).toBe(true);
    });

    it('has all required methods', () => {
      const plugin = getPlugin();
      expect(typeof plugin.isAvailable).toBe('function');
      expect(typeof plugin.install).toBe('function');
      expect(typeof plugin.installPackages).toBe('function');
      expect(typeof plugin.isInstalled).toBe('function');
      expect(typeof plugin.listInstalled).toBe('function');
    });

    it('installPackages returns correct shape', async () => {
      const plugin = getPlugin();
      const result = await plugin.installPackages(['test-package']);
      expect(result).toHaveProperty('installed');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('failed');
      expect(Array.isArray(result.installed)).toBe(true);
      expect(Array.isArray(result.skipped)).toBe(true);
      expect(Array.isArray(result.failed)).toBe(true);
    });

    it('listInstalled returns array of strings', async () => {
      const plugin = getPlugin();
      const result = await plugin.listInstalled();
      expect(Array.isArray(result)).toBe(true);
      result.forEach(pkg => expect(typeof pkg).toBe('string'));
    });

    it('isInstalled returns boolean', async () => {
      const plugin = getPlugin();
      const result = await plugin.isInstalled('any-package');
      expect(typeof result).toBe('boolean');
    });
  });
}
