/**
 * JetBrains (WebStorm / IntelliJ) EditorPlugin implementation (T024).
 */
import { access } from 'node:fs/promises';
import type { EditorPlugin } from '../../api.js';
import { installCask } from '../../../utils/package-manager.js';

export class WebStormPlugin implements EditorPlugin {
  readonly category = 'editor' as const;
  readonly id = 'webstorm';
  readonly label = 'WebStorm';
  readonly brewCask = 'webstorm';

  async detectInstalled(): Promise<boolean> {
    try { await access('/Applications/WebStorm.app'); return true; } catch { return false; }
  }

  async install(): Promise<void> { await installCask(this.brewCask!); }

  getProfileGuidance(): string {
    return [
      'WebStorm setup:',
      '  1. Sign in with your JetBrains account to sync settings',
      '  2. Install the GitHub Copilot or AI Assistant plugin',
      '  3. Use File → Manage IDE Settings → Settings Repository to sync dotfiles',
    ].join('\n');
  }
}

export class IntelliJPlugin implements EditorPlugin {
  readonly category = 'editor' as const;
  readonly id = 'intellij';
  readonly label = 'IntelliJ IDEA';
  readonly brewCask = 'intellij-idea';

  async detectInstalled(): Promise<boolean> {
    try { await access('/Applications/IntelliJ IDEA.app'); return true; } catch { return false; }
  }

  async install(): Promise<void> { await installCask(this.brewCask!); }

  getProfileGuidance(): string {
    return [
      'IntelliJ IDEA setup:',
      '  1. Sign in with your JetBrains account',
      '  2. Use Settings → IDE Settings Sync to sync across machines',
    ].join('\n');
  }
}

export const webStormPlugin = new WebStormPlugin();
export const intelliJPlugin = new IntelliJPlugin();
