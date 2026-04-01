/**
 * Zed EditorPlugin implementation (T024).
 */
import { access } from 'node:fs/promises';
import type { EditorPlugin } from '../../api.js';
import { installCask } from '../../../utils/package-manager.js';

export class ZedPlugin implements EditorPlugin {
  readonly category = 'editor' as const;
  readonly id = 'zed';
  readonly label = 'Zed';
  readonly brewCask = 'zed';

  async detectInstalled(): Promise<boolean> {
    try { await access('/Applications/Zed.app'); return true; } catch { return false; }
  }

  async install(): Promise<void> { await installCask(this.brewCask!); }

  getProfileGuidance(): string {
    return [
      'Zed setup:',
      '  1. Sign in at zed.dev to sync settings across machines',
      '  2. Configure ~/.config/zed/settings.json for personal preferences',
      '  3. Enable AI features via Settings → Assistant',
    ].join('\n');
  }
}

export const zedPlugin = new ZedPlugin();
