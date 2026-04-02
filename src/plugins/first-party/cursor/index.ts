/**
 * Cursor EditorPlugin implementation (T024).
 */
import { access } from 'node:fs/promises';
import type { EditorPlugin } from '../../api.js';
import { installCask } from '../../../utils/package-manager.js';

export class CursorPlugin implements EditorPlugin {
  readonly category = 'editor' as const;
  readonly id = 'cursor';
  readonly label = 'Cursor';
  readonly brewCask = 'cursor';

  async detectInstalled(): Promise<boolean> {
    try { await access('/Applications/Cursor.app'); return true; } catch { return false; }
  }

  async install(): Promise<void> { await installCask(this.brewCask!); }

  getProfileGuidance(): string {
    return [
      'Cursor setup:',
      '  1. Open Cursor → Settings → Cursor Settings',
      '  2. Enable "AI features" and connect to your preferred AI provider',
      '  3. Import VS Code settings via File → Preferences → Import Settings',
    ].join('\n');
  }
}

export const cursorPlugin = new CursorPlugin();
