import type { VersionManagerPlugin } from '../../api.js';
import { run } from '../../../utils/exec.js';
import { PluginError } from '../../api.js';
import homebrewPlugin from '../homebrew/index.js';

class VfoxPlugin implements VersionManagerPlugin {
  readonly id = 'vfox';
  readonly name = 'vfox';
  readonly version = '1.0.0';
  readonly category = 'version-manager' as const;
  readonly source = 'first-party' as const;
  readonly supportedPlatforms = ['darwin', 'linux', 'win32'] as const;
  readonly supportedLanguages = ['node', 'python', 'java', 'go', 'rust'];

  async isAvailable(): Promise<boolean> {
    try {
      await run('vfox', ['--version']);
      return true;
    } catch {
      return false;
    }
  }

  async install(): Promise<void> {
    try {
      const result = await homebrewPlugin.installPackages(['vfox']);
      if (result.failed.length > 0) {
        throw new PluginError(this.id, 'Failed to install vfox via Homebrew', 'INSTALL_FAILED');
      }
    } catch (err) {
      if (err instanceof PluginError) throw err;
      throw new PluginError(this.id, 'Failed to install vfox', 'INSTALL_FAILED', err as Error);
    }
  }

  async installVersion(language: string, version: string): Promise<{
    version: string;
    alreadyInstalled: boolean;
  }> {
    try {
      const installed = await this.listInstalled(language);
      if (installed.includes(version)) {
        return { version, alreadyInstalled: true };
      }
      await run('vfox', ['install', `${language}@${version}`]);
      return { version, alreadyInstalled: false };
    } catch (err) {
      if (err instanceof PluginError) throw err;
      throw new PluginError(
        this.id,
        `Failed to install ${language}@${version}`,
        'INSTALL_FAILED',
        err as Error
      );
    }
  }

  async useVersion(language: string, version: string): Promise<void> {
    try {
      await run('vfox', ['use', '--global', `${language}@${version}`]);
    } catch (err) {
      throw new PluginError(
        this.id,
        `Failed to set ${language}@${version} as global version`,
        'USE_FAILED',
        err as Error
      );
    }
  }

  async listInstalled(language: string): Promise<string[]> {
    try {
      const result = await run('vfox', ['list', language]);
      return result.stdout
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('->') && !l.startsWith('No'))
        .map(l => l.replace(/^\*?\s*/, '').split(' ')[0]);
    } catch {
      return [];
    }
  }

  generateShellHook(shell: 'zsh' | 'bash' | 'fish'): string {
    switch (shell) {
      case 'zsh':
        return 'eval "$(vfox activate zsh)"';
      case 'bash':
        return 'eval "$(vfox activate bash)"';
      case 'fish':
        return 'vfox activate fish | source';
    }
  }
}

export default new VfoxPlugin();
