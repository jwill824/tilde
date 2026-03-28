import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { AccountConnectorPlugin } from '../../api.js';
import type { DeveloperContext } from '../../../config/schema.js';

class SshConnector implements AccountConnectorPlugin {
  readonly id = 'ssh';
  readonly name = 'SSH';
  readonly version = '1.0.0';
  readonly category = 'account-connector' as const;
  readonly source = 'first-party' as const;
  readonly supportedPlatforms = ['darwin', 'linux'] as const;
  readonly platform = 'github';

  async isAvailable(): Promise<boolean> {
    try {
      await access(join(homedir(), '.ssh'));
      return true;
    } catch {
      return false;
    }
  }

  async connect(username: string): Promise<{ username: string; email?: string }> {
    console.log(`To connect ${username} via SSH, add your SSH public key to GitHub:`);
    console.log(`  https://github.com/settings/ssh/new`);
    console.log(`  Your public key: ${join(homedir(), '.ssh', 'id_ed25519.pub')} (or id_rsa.pub)`);
    return { username };
  }

  async switchAccount(_username: string): Promise<void> {
    // SSH uses per-host key config in ~/.ssh/config; no runtime switching needed
  }

  async currentAccount(): Promise<string | null> {
    return null;
  }

  generateShellHook(_contexts: DeveloperContext[]): string {
    return '';
  }
}

export default new SshConnector();
