/**
 * Neovim EditorPlugin implementation (T024).
 */
import type { EditorPlugin } from '../../api.js';
import { installFormula } from '../../../utils/package-manager.js';

export class NeovimPlugin implements EditorPlugin {
  readonly category = 'editor' as const;
  readonly id = 'neovim';
  readonly label = 'Neovim';
  readonly brewCask = 'neovim';  // actually a formula, but reusing the field

  async detectInstalled(): Promise<boolean> {
    // Neovim is a CLI tool — check if the binary exists
    const { execa } = await import('execa');
    try {
      await execa('nvim', ['--version'], { reject: true });
      return true;
    } catch {
      return false;
    }
  }

  async install(): Promise<void> {
    await installFormula('neovim');
  }

  getProfileGuidance(): string {
    return [
      'Neovim setup:',
      '  1. Install a plugin manager: git clone https://github.com/folke/lazy.nvim',
      '  2. Create your init.lua at ~/.config/nvim/init.lua',
      '  3. Consider LazyVim (lazyvim.org) for a pre-configured setup',
    ].join('\n');
  }
}

export const neovimPlugin = new NeovimPlugin();
