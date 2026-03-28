import type { PackageManagerPlugin } from '../../api.js';
import { run } from '../../../utils/exec.js';
import { PluginError } from '../../api.js';

class HomebrewPlugin implements PackageManagerPlugin {
  readonly id = 'homebrew';
  readonly name = 'Homebrew';
  readonly version = '1.0.0';
  readonly category = 'package-manager' as const;
  readonly source = 'first-party' as const;
  readonly supportedPlatforms = ['darwin'] as const;

  async isAvailable(): Promise<boolean> {
    try {
      await run('brew', ['--version']);
      return true;
    } catch {
      return false;
    }
  }

  async install(): Promise<void> {
    // Official Homebrew install script
    const INSTALL_URL = 'https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh';
    try {
      await run('bash', ['-c', `/bin/bash -c "$(curl -fsSL ${INSTALL_URL})"`]);
    } catch (err) {
      throw new PluginError(
        this.id,
        'Failed to install Homebrew. Please install manually from https://brew.sh',
        'INSTALL_FAILED',
        err as Error
      );
    }
  }

  async isInstalled(packageName: string): Promise<boolean> {
    try {
      const result = await run('brew', ['list', '--formula', '-1']);
      const formulae = result.stdout.split('\n').map(l => l.trim()).filter(Boolean);

      const resultCask = await run('brew', ['list', '--cask', '-1']);
      const casks = resultCask.stdout.split('\n').map(l => l.trim()).filter(Boolean);

      return formulae.includes(packageName) || casks.includes(packageName);
    } catch {
      return false;
    }
  }

  async installPackages(packages: string[]): Promise<{
    installed: string[];
    skipped: string[];
    failed: string[];
  }> {
    const installed: string[] = [];
    const skipped: string[] = [];
    const failed: string[] = [];

    for (const pkg of packages) {
      try {
        const alreadyInstalled = await this.isInstalled(pkg);
        if (alreadyInstalled) {
          skipped.push(pkg);
          continue;
        }
        await run('brew', ['install', pkg]);
        installed.push(pkg);
      } catch {
        failed.push(pkg);
        // Continue with other packages
      }
    }

    return { installed, skipped, failed };
  }

  async listInstalled(): Promise<string[]> {
    try {
      const result = await run('brew', ['list', '-1']);
      return result.stdout.split('\n').map(l => l.trim()).filter(Boolean);
    } catch (err) {
      throw new PluginError(
        this.id,
        'Failed to list installed packages',
        'LIST_FAILED',
        err as Error
      );
    }
  }
}

export default new HomebrewPlugin();
