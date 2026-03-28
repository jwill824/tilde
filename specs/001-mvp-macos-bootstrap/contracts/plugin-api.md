# Contract: Plugin API

All tilde integrations are implemented as plugins. A plugin is a class instance exported as
`export default new MyPlugin()`, implementing one of the category interfaces below.
First-party plugins live at `src/plugins/first-party/{name}/`. Community plugins are npm
packages named `tilde-plugin-{name}` following the same export convention.

---

## Plugin Discovery (3-Layer)

| Layer | Source | How loaded |
|-------|--------|-----------|
| **First-party** | Bundled in tilde repo | Static imports in `src/plugins/registry.ts` |
| **Community** | npm packages `tilde-plugin-*` | Dynamic `import()` at runtime; listed in `tilde.config.json` |
| **Local** | Filesystem paths | Dynamic `import()` from absolute path; listed in `~/.tilde/config.json` |

---

## Error Handling

Plugins **throw** `PluginError` on failure. The `PluginExecutor` wrapper catches and routes
errors to the Ink UI with recovery options (retry / skip / abort).

```ts
export class PluginError extends Error {
  constructor(
    public readonly pluginId: string,
    message: string,
    public readonly code?: string,        // e.g. 'INSTALL_FAILED', 'NOT_AUTHENTICATED'
    public readonly originalError?: Error,
    public readonly severity: 'error' | 'warning' = 'error'
  ) {
    super(message);
    this.name = 'PluginError';
  }
}
```

---

## Base Interface

```ts
interface TildePlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly category: PluginCategory;
  readonly source: 'first-party' | 'community' | 'local';
  readonly supportedPlatforms: ('darwin' | 'linux' | 'win32')[];
  isAvailable(): Promise<boolean>;
}

type PluginCategory =
  | 'package-manager'
  | 'secrets-backend'
  | 'account-connector'
  | 'env-loader'
  | 'version-manager';
```

---

## Package Manager Plugin

```ts
interface PackageManagerPlugin extends TildePlugin {
  readonly category: 'package-manager';
  isAvailable(): Promise<boolean>;
  install(): Promise<void>;                           // Install the package manager itself
  installPackages(packages: string[]): Promise<{
    installed: string[];                              // Newly installed
    skipped: string[];                               // Already installed (idempotent)
    failed: string[];
  }>;
  isInstalled(packageName: string): Promise<boolean>;
  listInstalled(): Promise<string[]>;
}
```

**First-party implementation**: `src/plugins/first-party/homebrew/`
**Conformance test**: `tests/contract/package-manager.contract.ts`

---

## Secrets Backend Plugin

```ts
interface SecretsBackendPlugin extends TildePlugin {
  readonly category: 'secrets-backend';
  isAvailable(): Promise<boolean>;
  /** Generate a backend reference string — never a resolved value */
  generateReference(opts: { vault?: string; item: string; field: string }): string;
  /** Validate backend is reachable and authenticated */
  validate(): Promise<{ valid: boolean; accountName?: string }>;
  /** Shell code to inject before .envrc loads (e.g., `eval "$(op signin)"`) */
  getRuntimeInitCode?(): string;
}
```

**First-party implementation**: `src/plugins/first-party/onepassword/`
**Conformance test**: `tests/contract/secrets-backend.contract.ts`

---

## Account Connector Plugin

```ts
interface AccountConnectorPlugin extends TildePlugin {
  readonly category: 'account-connector';
  readonly platform: string;                         // e.g. "github"
  isAvailable(): Promise<boolean>;
  connect(username: string): Promise<{ username: string; email?: string }>;
  switchAccount(username: string): Promise<void>;
  currentAccount(): Promise<string | null>;
  /** Generate shell cd-hook snippet for auto-switching on directory change */
  generateShellHook(contexts: Array<{ path: string; username: string }>): string;
}
```

**First-party implementation**: `src/plugins/first-party/gh-cli/`
**Conformance test**: `tests/contract/account-connector.contract.ts`

---

## Env Loader Plugin

```ts
interface EnvLoaderPlugin extends TildePlugin {
  readonly category: 'env-loader';
  isAvailable(): Promise<boolean>;
  install(): Promise<void>;
  generateEnvrc(opts: {
    envVars: Array<{ key: string; value: string }>;  // value = backend reference
    secretsBackend: SecretsBackendPlugin;
  }): string;
  generateShellHook(shell: 'zsh' | 'bash' | 'fish'): string;
}
```

**First-party implementation**: `src/plugins/first-party/direnv/`
**Conformance test**: `tests/contract/env-loader.contract.ts`

---

## Version Manager Plugin

```ts
interface VersionManagerPlugin extends TildePlugin {
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
```

**First-party implementation**: `src/plugins/first-party/vfox/`
**Conformance test**: `tests/contract/version-manager.contract.ts`

---

## Plugin Registry Interface

```ts
interface PluginRegistry {
  register(plugin: TildePlugin): void;
  get<T extends TildePlugin>(category: PluginCategory, id: string): T | undefined;
  getAll(category: PluginCategory): TildePlugin[];
}
```

## Community Plugin Config

Community and local plugins are declared in config — never auto-discovered:

```json
// tilde.config.json
{
  "plugins": {
    "community": {
      "tilde-plugin-bitwarden": "^1.5.0"
    }
  }
}

// ~/.tilde/config.json (user-global, never committed)
{
  "plugins": {
    "paths": ["/Users/me/experimental-plugin"]
  }
}
```

---

## Breaking Change Policy

Changes to any interface in this contract that remove, rename, or change the signature of
an existing method constitute a **BREAKING CHANGE** and MUST trigger a major version bump
of tilde (per constitution Principle VIII). New optional methods may be added in minor versions.
