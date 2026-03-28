import type { AccountConnectorPlugin } from '../../api.js';
import { run } from '../../../utils/exec.js';
import { PluginError } from '../../api.js';

class GhCliPlugin implements AccountConnectorPlugin {
  readonly id = 'gh-cli';
  readonly name = 'GitHub CLI';
  readonly version = '1.0.0';
  readonly category = 'account-connector' as const;
  readonly source = 'first-party' as const;
  readonly supportedPlatforms = ['darwin', 'linux'] as const;
  readonly platform = 'github';

  async isAvailable(): Promise<boolean> {
    try {
      await run('gh', ['--version']);
      return true;
    } catch {
      return false;
    }
  }

  async connect(username: string): Promise<{ username: string; email?: string }> {
    try {
      await run('gh', ['auth', 'login', '--web', '--hostname', 'github.com']);
      return { username };
    } catch (err) {
      throw new PluginError(
        this.id,
        `Failed to authenticate GitHub account: ${username}`,
        'NOT_AUTHENTICATED',
        err as Error
      );
    }
  }

  async switchAccount(username: string): Promise<void> {
    try {
      await run('gh', ['auth', 'switch', '--user', username]);
    } catch (err) {
      throw new PluginError(
        this.id,
        `Failed to switch to GitHub account: ${username}`,
        'SWITCH_FAILED',
        err as Error
      );
    }
  }

  async currentAccount(): Promise<string | null> {
    try {
      const result = await run('gh', ['auth', 'status', '--active']);
      // Parse "Logged in to github.com account username (keyring)"
      const match = result.stdout.match(/account (\S+)/);
      return match?.[1] ?? null;
    } catch {
      return null;
    }
  }

  generateShellHook(contexts: Array<{ path: string; username: string }>): string {
    const cases = contexts
      .map(ctx => {
        const expandedPath = ctx.path.replace(/^~/, '$HOME');
        return `    ${expandedPath}*)
      gh auth switch --user ${ctx.username} 2>/dev/null || true
      ;;`;
      })
      .join('\n');

    return `# tilde: gh-cli context switching
function cd() {
  builtin cd "$@" || return
  case "$PWD" in
${cases}
  esac
}`;
  }
}

export default new GhCliPlugin();
