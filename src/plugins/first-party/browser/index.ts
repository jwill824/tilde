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
import { browserToolMetadata } from './metadata.js';
import type { ToolMetadata } from '../../../tools/metadata.js';

// ---------------------------------------------------------------------------
// Base browser implementation
// ---------------------------------------------------------------------------

class BaseBrowserPlugin implements BrowserPlugin {
  readonly category = 'browser' as const;
  readonly id: string;
  readonly label: string;
  readonly appPath: string;
  readonly brewCask: string | undefined;
  readonly defaultBrowserId: string;

  constructor(metadata: ToolMetadata) {
    this.id = metadata.id;
    this.label = metadata.label;
    this.appPath = metadata.install?.appPath ?? '';
    this.brewCask = metadata.install?.homebrew?.cask;
    this.defaultBrowserId = metadata.externalIds?.defaultbrowser ?? metadata.id;
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
  // Safari is always present and not installable via Homebrew
  async install(): Promise<void> { /* always installed */ }
}

// ---------------------------------------------------------------------------
// Registry of all browser plugins
// ---------------------------------------------------------------------------

export const BROWSER_PLUGINS: BrowserPlugin[] = [
  ...browserToolMetadata.map(metadata =>
    metadata.id === 'safari'
      ? new SafariPlugin(metadata)
      : new BaseBrowserPlugin(metadata)
  ),
];
