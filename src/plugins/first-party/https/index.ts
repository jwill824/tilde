import type { AccountConnectorPlugin } from '../../api.js';
import { run } from '../../../utils/exec.js';
import { PluginError } from '../../api.js';
import type { DeveloperContext } from '../../../config/schema.js';

class HttpsConnector implements AccountConnectorPlugin {
  readonly id = 'https';
  readonly name = 'HTTPS';
  readonly version = '1.0.0';
  readonly category = 'account-connector' as const;
  readonly source = 'first-party' as const;
  readonly supportedPlatforms = ['darwin', 'linux', 'win32'] as const;
  readonly platform = 'github';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async connect(username: string): Promise<{ username: string; email?: string }> {
    try {
      await run('git', ['config', '--global', 'credential.helper', '!/opt/homebrew/bin/gh auth git-credential']);
      return { username };
    } catch (err) {
      throw new PluginError(
        this.id,
        `Failed to configure HTTPS credential helper for: ${username}`,
        'CONNECT_FAILED',
        err as Error
      );
    }
  }

  async switchAccount(_username: string): Promise<void> {
    // HTTPS uses credential helper; no per-account switching needed
  }

  async currentAccount(): Promise<string | null> {
    return null;
  }

  generateShellHook(_contexts: DeveloperContext[]): string {
    return '';
  }
}

export default new HttpsConnector();
