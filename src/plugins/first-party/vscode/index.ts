/**
 * VS Code EditorPlugin implementation (T023).
 *
 * Refactored from src/dotfiles/vscode.ts to implement the EditorPlugin interface.
 * The original dotfiles/vscode.ts is kept for backward compatibility.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { access } from 'node:fs/promises';
import type { EditorPlugin } from '../../api.js';
import { installCask } from '../../../utils/package-manager.js';
import type { DeveloperContext } from '../../../config/schema.js';

function expandTilde(p: string): string {
  if (p.startsWith('~/')) return join(homedir(), p.slice(2));
  return p;
}

export class VSCodePlugin implements EditorPlugin {
  readonly category = 'editor' as const;
  readonly id = 'vscode';
  readonly label = 'Visual Studio Code';
  readonly brewCask = 'visual-studio-code';

  async detectInstalled(): Promise<boolean> {
    try {
      await access('/Applications/Visual Studio Code.app');
      return true;
    } catch {
      return false;
    }
  }

  async install(): Promise<void> {
    await installCask(this.brewCask!);
  }

  async applyProfile(context?: DeveloperContext, dotfilesRepo?: string): Promise<void> {
    if (!context || !dotfilesRepo) return;
    const settings = {
      'workbench.colorTheme': 'Default Dark+',
    };
    const repoPath = expandTilde(dotfilesRepo);
    const dir = join(repoPath, 'vscode');
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, `${context.label}-settings.json`),
      JSON.stringify(settings, null, 2),
      'utf-8'
    );
  }

  getProfileGuidance(): string {
    return [
      'VS Code setup:',
      '  1. Open VS Code',
      '  2. Install the "Settings Sync" extension (or use built-in sync)',
      '  3. Sign in with your GitHub account to sync settings',
    ].join('\n');
  }
}

export const vscodePlugin = new VSCodePlugin();
