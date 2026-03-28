import type { SecretsBackendPlugin } from '../../api.js';
import { run } from '../../../utils/exec.js';
import { PluginError } from '../../api.js';

class OnePasswordPlugin implements SecretsBackendPlugin {
  readonly id = '1password';
  readonly name = '1Password';
  readonly version = '1.0.0';
  readonly category = 'secrets-backend' as const;
  readonly source = 'first-party' as const;
  readonly supportedPlatforms = ['darwin', 'linux', 'win32'] as const;

  async isAvailable(): Promise<boolean> {
    try {
      await run('op', ['--version']);
      return true;
    } catch {
      return false;
    }
  }

  generateReference(opts: { vault?: string; item: string; field: string }): string {
    const vault = opts.vault ?? 'Personal';
    return `op://${vault}/${opts.item}/${opts.field}`;
  }

  async validate(): Promise<{ valid: boolean; accountName?: string }> {
    try {
      const result = await run('op', ['account', 'list', '--format=json']);
      const accounts = JSON.parse(result.stdout) as Array<{ email?: string; url?: string }>;
      if (accounts.length === 0) {
        return { valid: false };
      }
      return { valid: true, accountName: accounts[0]?.email };
    } catch {
      return { valid: false };
    }
  }

  getRuntimeInitCode(): string {
    return 'eval "$(op signin)"';
  }
}

export default new OnePasswordPlugin();
