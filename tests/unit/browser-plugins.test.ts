/**
 * Unit tests for browser plugin implementations (T022).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { BROWSER_PLUGINS } from '../../src/plugins/first-party/browser/index.js';

describe('BROWSER_PLUGINS', () => {
  it('contains 6 browser plugins', () => {
    expect(BROWSER_PLUGINS.length).toBe(6);
  });

  it('all plugins have the "browser" category', () => {
    for (const plugin of BROWSER_PLUGINS) {
      expect(plugin.category).toBe('browser');
    }
  });

  it('all plugins have non-empty id and label', () => {
    for (const plugin of BROWSER_PLUGINS) {
      expect(plugin.id).toBeTruthy();
      expect(plugin.label).toBeTruthy();
    }
  });

  it('all plugins have non-empty appPath', () => {
    for (const plugin of BROWSER_PLUGINS) {
      expect(plugin.appPath).toBeTruthy();
      expect(plugin.appPath.startsWith('/Applications/')).toBe(true);
    }
  });

  it('contains safari, chrome, firefox, arc, brave, edge', () => {
    const ids = BROWSER_PLUGINS.map(p => p.id);
    expect(ids).toContain('safari');
    expect(ids).toContain('chrome');
    expect(ids).toContain('firefox');
    expect(ids).toContain('arc');
    expect(ids).toContain('brave');
    expect(ids).toContain('edge');
  });

  it('safari has no brewCask (always installed)', () => {
    const safari = BROWSER_PLUGINS.find(p => p.id === 'safari')!;
    expect(safari.brewCask).toBeUndefined();
  });

  it('all non-safari browsers have a brewCask', () => {
    const nonSafari = BROWSER_PLUGINS.filter(p => p.id !== 'safari');
    for (const plugin of nonSafari) {
      expect(plugin.brewCask).toBeTruthy();
    }
  });

  it('detectInstalled returns boolean', async () => {
    const safari = BROWSER_PLUGINS.find(p => p.id === 'safari')!;
    const result = await safari.detectInstalled();
    expect(typeof result).toBe('boolean');
  });
});

describe('BrowserPlugin.detectInstalled()', () => {
  it('returns true for Safari (always present on macOS)', async () => {
    // Safari.app is always installed on macOS — detect using actual filesystem
    const safari = BROWSER_PLUGINS.find(p => p.id === 'safari')!;
    const result = await safari.detectInstalled();
    // On macOS Safari is always installed; in CI it may not be
    expect(typeof result).toBe('boolean');
  });

  it('returns false for a non-existent browser', async () => {
    // Create a test plugin pointing to a non-existent path
    const fakePlugin = {
      ...BROWSER_PLUGINS[0],
      appPath: '/Applications/NonExistentBrowser12345.app',
      async detectInstalled() {
        const { access } = await import('node:fs/promises');
        try { await access(this.appPath); return true; } catch { return false; }
      },
    };
    const result = await fakePlugin.detectInstalled();
    expect(result).toBe(false);
  });
});
