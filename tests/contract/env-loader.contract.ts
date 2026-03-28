import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EnvLoaderPlugin, SecretsBackendPlugin } from '../../src/plugins/api.js';

export function runEnvLoaderContractTests(
  getPlugin: () => EnvLoaderPlugin,
  mockExec: () => void
) {
  describe('EnvLoaderPlugin contract', () => {
    beforeEach(() => {
      mockExec();
    });

    it('has required interface properties', () => {
      const plugin = getPlugin();
      expect(plugin.id).toBeDefined();
      expect(typeof plugin.id).toBe('string');
      expect(plugin.name).toBeDefined();
      expect(plugin.category).toBe('env-loader');
      expect(plugin.source).toMatch(/^(first-party|community|local)$/);
      expect(Array.isArray(plugin.supportedPlatforms)).toBe(true);
    });

    it('has all required methods', () => {
      const plugin = getPlugin();
      expect(typeof plugin.isAvailable).toBe('function');
      expect(typeof plugin.install).toBe('function');
      expect(typeof plugin.generateEnvrc).toBe('function');
      expect(typeof plugin.generateShellHook).toBe('function');
    });

    it('isAvailable returns boolean', async () => {
      const plugin = getPlugin();
      const result = await plugin.isAvailable();
      expect(typeof result).toBe('boolean');
    });

    it('generateEnvrc returns a string for minimal opts', () => {
      const plugin = getPlugin();
      const mockSecretsBackend: SecretsBackendPlugin = {
        id: 'mock',
        name: 'Mock',
        version: '1.0.0',
        category: 'secrets-backend',
        source: 'first-party',
        supportedPlatforms: ['darwin'],
        isAvailable: async () => true,
        generateReference: () => 'mock-ref',
        validate: async () => ({ valid: true }),
      };
      const result = plugin.generateEnvrc({ envVars: [], secretsBackend: mockSecretsBackend });
      expect(typeof result).toBe('string');
    });

    it('generateShellHook returns string containing direnv for zsh', () => {
      const plugin = getPlugin();
      const hook = plugin.generateShellHook('zsh');
      expect(typeof hook).toBe('string');
      expect(hook).toContain('direnv');
    });

    it('generateShellHook returns string containing direnv for bash', () => {
      const plugin = getPlugin();
      const hook = plugin.generateShellHook('bash');
      expect(typeof hook).toBe('string');
      expect(hook).toContain('direnv');
    });

    it('generateShellHook returns string containing direnv for fish', () => {
      const plugin = getPlugin();
      const hook = plugin.generateShellHook('fish');
      expect(typeof hook).toBe('string');
      expect(hook).toContain('direnv');
    });
  });
}
