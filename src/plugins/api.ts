import type { DeveloperContext } from '../config/schema.js';

export class PluginError extends Error {
  constructor(
    public readonly pluginId: string,
    message: string,
    public readonly code?: string,
    public readonly originalError?: Error,
    public readonly severity: 'error' | 'warning' = 'error'
  ) {
    super(message);
    this.name = 'PluginError';
  }
}

export type PluginCategory =
  | 'package-manager'
  | 'secrets-backend'
  | 'account-connector'
  | 'env-loader'
  | 'version-manager'
  | 'browser'
  | 'editor'
  | 'ai-tool';

export interface TildePlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly category: PluginCategory;
  readonly source: 'first-party' | 'community' | 'local';
  readonly supportedPlatforms: readonly ('darwin' | 'linux' | 'win32')[];
  isAvailable(): Promise<boolean>;
}

export interface PackageManagerPlugin extends TildePlugin {
  readonly category: 'package-manager';
  isAvailable(): Promise<boolean>;
  install(): Promise<void>;
  installPackages(packages: string[]): Promise<{
    installed: string[];
    skipped: string[];
    failed: string[];
  }>;
  isInstalled(packageName: string): Promise<boolean>;
  listInstalled(): Promise<string[]>;
}

export interface SecretsBackendPlugin extends TildePlugin {
  readonly category: 'secrets-backend';
  isAvailable(): Promise<boolean>;
  generateReference(opts: { vault?: string; item: string; field: string }): string;
  validate(): Promise<{ valid: boolean; accountName?: string }>;
  getRuntimeInitCode?(): string;
}

export interface AccountConnectorPlugin extends TildePlugin {
  readonly category: 'account-connector';
  readonly platform: string;
  isAvailable(): Promise<boolean>;
  connect(username: string): Promise<{ username: string; email?: string }>;
  switchAccount(username: string): Promise<void>;
  currentAccount(): Promise<string | null>;
  generateShellHook(contexts: DeveloperContext[]): string;
}

export interface EnvLoaderPlugin extends TildePlugin {
  readonly category: 'env-loader';
  isAvailable(): Promise<boolean>;
  install(): Promise<void>;
  generateEnvrc(opts: {
    context?: DeveloperContext;
    envVars: Array<{ key: string; value: string }>;
    secretsBackend: SecretsBackendPlugin;
  }): string;
  generateShellHook(shell: 'zsh' | 'bash' | 'fish'): string;
}

export interface VersionManagerPlugin extends TildePlugin {
  readonly category: 'version-manager';
  readonly supportedLanguages: string[];
  isAvailable(): Promise<boolean>;
  install(): Promise<void>;
  installVersion(language: string, version: string): Promise<{
    version: string;
    alreadyInstalled: boolean;
  }>;
  useVersion(language: string, version: string): Promise<void>;
  listInstalled(language: string): Promise<string[]>;
  generateShellHook(shell: 'zsh' | 'bash' | 'fish'): string;
}

// ---------------------------------------------------------------------------
// New plugin categories (v1.5): browser, editor, and ai-tool
// ---------------------------------------------------------------------------

export interface BrowserPlugin {
  readonly category: 'browser';
  readonly id: string;          // e.g., "chrome", "arc"
  readonly label: string;       // e.g., "Google Chrome", "Arc"
  readonly appPath: string;     // e.g., "/Applications/Arc.app"
  readonly brewCask?: string;   // e.g., "arc" — undefined if not Homebrew-installable

  /** Returns true if the browser .app bundle exists on disk */
  detectInstalled(): Promise<boolean>;
  /** Install via Homebrew cask */
  install(): Promise<void>;
  /** Invoke `defaultbrowser <id>` — triggers macOS system confirmation dialog */
  setAsDefault(): Promise<void>;
}

export interface EditorPlugin {
  readonly category: 'editor';
  readonly id: string;         // e.g., "neovim", "cursor", "webstorm"
  readonly label: string;      // e.g., "Neovim", "Cursor", "WebStorm"
  readonly brewCask?: string;  // e.g., "neovim", "cursor"

  /** Returns true if the editor .app or binary exists on disk */
  detectInstalled(): Promise<boolean>;
  /** Install via Homebrew (cask or formula) */
  install(): Promise<void>;
  /** Optional: apply dotfiles/settings profile */
  applyProfile?(): Promise<void>;
  /** Optional: return human-readable setup instructions */
  getProfileGuidance?(): string;
}

export interface AIToolPlugin {
  readonly category: 'ai-tool';
  readonly name: string;           // e.g., "claude-desktop"
  readonly label: string;          // e.g., "Claude Desktop"
  readonly variant: string;        // e.g., "desktop-app" | "cli-tool" | "editor-extension"
  readonly brewId: string;         // Homebrew formula or cask name
  readonly brewType: 'formula' | 'cask';

  /** Returns true if the tool is currently installed */
  detectInstalled(): Promise<boolean>;
  /** Install via Homebrew (formula or cask) */
  install(): Promise<void>;
}
