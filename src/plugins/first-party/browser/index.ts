/**
 * BrowserPlugin implementations for macOS (T019).
 *
 * Detects installed browsers by checking known .app bundle paths in /Applications/
 * (not Homebrew-dependent — per research.md §2).
 *
 * Browser default-setting uses `defaultbrowser` Homebrew CLI — triggers macOS
 * system dialog that cannot be bypassed (per research.md §3).
 */
import { access } from 'node:fs/promises';
import type { BrowserPlugin } from '../../api.js';
import { installCask, installFormula } from '../../../utils/package-manager.js';
import { execa } from 'execa';

// ---------------------------------------------------------------------------
// Base browser implementation
// ---------------------------------------------------------------------------

abstract class BaseBrowserPlugin implements BrowserPlugin {
  readonly category = 'browser' as const;
  abstract readonly id: string;
  abstract readonly label: string;
  abstract readonly appPath: string;
  readonly brewCask: string | undefined;
  readonly defaultBrowserId: string;

  constructor(opts: { brewCask?: string; defaultBrowserId: string }) {
    this.brewCask = opts.brewCask;
    this.defaultBrowserId = opts.defaultBrowserId;
  }

  async detectInstalled(): Promise<boolean> {
    try {
      await access(this.appPath);
      return true;
    } catch {
      return false;
    }
  }

  async install(): Promise<void> {
    if (!this.brewCask) {
      throw new Error(`${this.label} cannot be installed via Homebrew (no cask defined)`);
    }
    await installCask(this.brewCask);
  }

  async setAsDefault(): Promise<void> {
    // Ensure defaultbrowser is installed
    try {
      await installFormula('defaultbrowser');
    } catch {
      // May already be installed or offline — continue
    }
    // Invoke defaultbrowser — this triggers macOS system confirmation dialog
    await execa('defaultbrowser', [this.defaultBrowserId]);
  }
}

// ---------------------------------------------------------------------------
// Browser implementations
// ---------------------------------------------------------------------------

class SafariPlugin extends BaseBrowserPlugin {
  readonly id = 'safari';
  readonly label = 'Safari';
  readonly appPath = '/Applications/Safari.app';
  constructor() { super({ defaultBrowserId: 'safari' }); }
  // Safari is always present and not installable via Homebrew
  async install(): Promise<void> { /* always installed */ }
}

class ChromePlugin extends BaseBrowserPlugin {
  readonly id = 'chrome';
  readonly label = 'Google Chrome';
  readonly appPath = '/Applications/Google Chrome.app';
  constructor() { super({ brewCask: 'google-chrome', defaultBrowserId: 'chrome' }); }
}

class FirefoxPlugin extends BaseBrowserPlugin {
  readonly id = 'firefox';
  readonly label = 'Firefox';
  readonly appPath = '/Applications/Firefox.app';
  constructor() { super({ brewCask: 'firefox', defaultBrowserId: 'firefox' }); }
}

class ArcPlugin extends BaseBrowserPlugin {
  readonly id = 'arc';
  readonly label = 'Arc';
  readonly appPath = '/Applications/Arc.app';
  constructor() { super({ brewCask: 'arc', defaultBrowserId: 'arc' }); }
}

class BravePlugin extends BaseBrowserPlugin {
  readonly id = 'brave';
  readonly label = 'Brave Browser';
  readonly appPath = '/Applications/Brave Browser.app';
  constructor() { super({ brewCask: 'brave-browser', defaultBrowserId: 'brave' }); }
}

class EdgePlugin extends BaseBrowserPlugin {
  readonly id = 'edge';
  readonly label = 'Microsoft Edge';
  readonly appPath = '/Applications/Microsoft Edge.app';
  constructor() { super({ brewCask: 'microsoft-edge', defaultBrowserId: 'edge' }); }
}

// ---------------------------------------------------------------------------
// Registry of all browser plugins
// ---------------------------------------------------------------------------

export const BROWSER_PLUGINS: BrowserPlugin[] = [
  new SafariPlugin(),
  new ChromePlugin(),
  new FirefoxPlugin(),
  new ArcPlugin(),
  new BravePlugin(),
  new EdgePlugin(),
];
