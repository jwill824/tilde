# Data Model: MVP — macOS Developer Environment Bootstrap

## Entities

### 1. TildeConfig (`tilde.config.json`)

The portable, versioned output of every tilde run. Written to the user's dotfiles repo.
Drives config-first restore. MUST NOT contain resolved secret values.

```ts
interface TildeConfig {
  $schema: string;             // "https://tilde.sh/config-schema/v1.json"
  version: "1";
  os: "macos";                 // MVP: macos only
  shell: "zsh" | "bash" | "fish";
  packageManager: "homebrew";  // MVP: homebrew only
  versionManagers: VersionManagerChoice[];
  languages: LanguageChoice[];
  workspaceRoot: string;       // e.g. "~/Developer"
  contexts: DeveloperContext[];
  tools: string[];             // Additional Homebrew formulae/casks
  configurations: ConfigurationDomains;
  secretsBackend: "1password" | "keychain" | "env-only";
  dotfilesRepo: string;        // Absolute or ~ path to dotfiles git repo
}

interface VersionManagerChoice {
  name: "vfox" | "nvm" | "pyenv" | "sdkman";
}

interface LanguageChoice {
  name: string;                // e.g. "node", "python", "java"
  version: string;             // semver string
  manager: string;             // name of version manager to use
}

interface ConfigurationDomains {
  git: boolean;
  vscode: boolean;
  aliases: boolean;
  osDefaults: boolean;
  direnv: boolean;             // user-selectable; defaults to true
}
```

**Identity rule**: Uniqueness enforced by `dotfilesRepo` path + `contexts[].label`.
**Lifecycle**: Created at end of wizard run. Updated by `tilde reconfigure`. Never auto-mutated.
**Validation**: Zod schema at `src/config/schema.ts`; validated at every load.

---

### 2. DeveloperContext

A named environment boundary within the user's workspace.

```ts
interface DeveloperContext {
  label: string;               // e.g. "personal", "work", "client"
  path: string;                // e.g. "~/Developer/personal"
  git: GitIdentity;
  github?: GitHubAccount;
  authMethod: "gh-cli" | "https" | "ssh";
  envVars: EnvVarReference[];  // References only — no resolved values
  vscodeProfile?: string;      // VS Code profile name
  isDefault?: boolean;         // Active when no other context matches PWD
}

interface GitIdentity {
  name: string;
  email: string;
}

interface GitHubAccount {
  username: string;
}

interface EnvVarReference {
  key: string;
  value: string;               // Backend reference, e.g. "op://Vault/Item/Field"
}
```

**Identity rule**: `label` MUST be unique within a `TildeConfig`. `path` MUST NOT overlap
with another context's path (checked at validation time).
**Lifecycle**: Created during wizard step 07-contexts. Referenced throughout subsequent steps.

---

### 3. EnvironmentCaptureReport

Transient scan result. Used to pre-populate wizard defaults. Never persisted.

```ts
interface EnvironmentCaptureReport {
  dotfiles: DetectedDotfile[];
  packages: string[];          // Output of `brew list -1`
  rcContent: RcFileContent[];
}

interface DetectedDotfile {
  path: string;                // Absolute path
  isSymlink: boolean;
  symlinkTarget?: string;
}

interface RcFileContent {
  path: string;
  aliases: string[];           // Parsed `alias foo=...` lines
  exports: string[];           // Parsed `export VAR=...` lines (non-secret)
  sourcedFiles: string[];      // Files sourced via `source` or `.`
}
```

**Lifecycle**: Created during step 01-env-capture. Discarded after wizard completes or
user skips the step. Files matching `.gitignore` patterns are excluded before parsing.

---

### 4. CheckpointState (`~/.tilde/state.json`)

Persisted progress tracker enabling resume after failure or interruption.

```ts
interface CheckpointState {
  schemaVersion: 1;
  sessionId: string;           // UUID v4
  startedAt: string;           // ISO 8601
  lastCompletedStep: number;   // 0-based step index; -1 if none completed
  partialConfig: Partial<TildeConfig>;
}
```

**Lifecycle**: Created at wizard start. Updated after each step completes. Deleted on
successful completion. User can manually delete to force fresh start.
**Location**: `~/.tilde/state.json` (not in dotfiles repo, not tracked by git).

---

### 5. Plugin

A registered integration module implementing one of the plugin interfaces.

```ts
interface PluginManifest {
  id: string;                  // e.g. "homebrew", "tilde-plugin-apt"
  name: string;
  version: string;
  category: PluginCategory;
  firstParty: boolean;
}

type PluginCategory =
  | "package-manager"
  | "secrets-backend"
  | "account-connector"
  | "env-loader"
  | "version-manager";
```

**Lifecycle**: First-party plugins are statically imported at startup. Community plugins are
loaded dynamically from npm packages matching `tilde-plugin-*`.

---

## State Transitions

### Setup Run Lifecycle

```
idle
  → [bootstrap.sh runs]
  → detecting
  → [config found?] → config-first-review → confirming → applying
  → [no config] → capturing → wizard-step-N → ... → wizard-step-13
  → writing-config
  → complete
  → [error at any step] → checkpoint-saved → idle (resumable)
```

### Context Resolution Lifecycle

```
shell-cd-event
  → [match PWD against context paths]
  → [match found] → switch-git-identity + switch-gh-account + load-envrc
  → [no match] → activate-default-context
```

---

## Data Volume / Scale Assumptions

- Max contexts per config: 10 (UI limit; no technical constraint)
- Max tools list: 200 Homebrew packages (Homebrew handles actual limits)
- Capture report: bounded by `~/` filesystem size; fast-glob scan limited to depth 3
- `tilde.config.json`: expected < 50KB for any realistic config
- Checkpoint state: < 5KB; single file, atomic writes via `conf` package
