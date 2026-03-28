# Contract: tilde.config.json Schema

Schema version: **v1** (schemaVersion field: **1**)
JSON Schema: `https://tilde.sh/config-schema/v1.json` *(published at release)*

**Spec 002 change**: Added `schemaVersion` integer field. All other fields unchanged from
spec 001. See [Migration](#schema-migration) section for versioning semantics.

---

## Full Schema (TypeScript + annotations)

```ts
/**
 * tilde.config.json — v1
 * The portable, versioned configuration produced by every tilde run.
 * Safe to commit to your dotfiles repo. MUST NOT contain resolved secret values.
 */
interface TildeConfig {
  // --- Meta ---
  $schema: string;                       // Required. Points to JSON Schema URL.
  version: "1";                          // Required. String literal schema edition.
  schemaVersion: number;                 // Required (integer ≥ 1). Migration version.
                                         // Default: 1. Absent in pre-002 configs →
                                         // treated as 1 by the migration runner.
  os: "macos";                           // Required. "windows" added in future spec.

  // --- Stack ---
  shell: "zsh" | "bash" | "fish";        // Required.
  packageManager: "homebrew";            // Required. Extendable via plugin.
  versionManagers: {
    name: "vfox" | "nvm" | "pyenv" | "sdkman";
  }[];                                   // Optional. Empty array = none selected.

  languages: {
    name: string;                        // e.g. "node", "python"
    version: string;                     // Semver string
    manager: string;                     // Must match a name in versionManagers
  }[];

  // --- Workspace ---
  workspaceRoot: string;                 // Required. e.g. "~/Developer"
  dotfilesRepo: string;                  // Required. Abs path or ~ path.

  // --- Contexts ---
  contexts: {
    label: string;                       // Required. Unique within config.
    path: string;                        // Required. Under workspaceRoot.
    git: {
      name: string;                      // git user.name for this context
      email: string;                     // git user.email for this context
    };
    github?: {
      username: string;
    };
    authMethod: "gh-cli" | "https" | "ssh";
    envVars?: {
      key: string;
      value: string;                     // Backend reference ONLY — no resolved values
    }[];
    vscodeProfile?: string;              // VS Code profile name
    isDefault?: boolean;                 // Active when no other context matches PWD
  }[];

  // --- Tools ---
  tools: string[];                       // Homebrew formulae/cask names

  // --- Configuration Domains ---
  configurations: {
    git: boolean;                        // Manage .gitconfig and context overrides
    vscode: boolean;                     // Manage VS Code settings/profiles
    aliases: boolean;                    // Manage shell aliases file
    osDefaults: boolean;                 // Apply macOS defaults write commands
    direnv: boolean;                     // Install direnv + generate .envrc files
  };

  // --- Accounts ---
  accounts?: {
    service: "github" | "claude" | "aws" | string;
    identifier: string;                  // Username, profile name, or account ID
    secretRef?: string;                  // Backend reference for API key if needed
  }[];

  // --- Secrets ---
  secretsBackend: "1password" | "keychain" | "env-only";
}
```

---

## Validation Rules

| Field | Rule |
|-------|------|
| `schemaVersion` | Integer ≥ 1. If absent, defaults to 1 (backward compat, FR-020). Never written as absent by tilde. |
| `contexts[].label` | Unique within the `contexts` array |
| `contexts[].path` | Must not overlap with another context's path |
| `contexts[].authMethod` | Must be one of the three enum values |
| `contexts[].envVars[].value` | MUST NOT match `/^(ghp_|sk-|AKIA|xox[bp]-)/` — these look like raw secrets |
| `languages[].manager` | Must match a `name` in `versionManagers` array |
| `dotfilesRepo` | Must be an absolute path or start with `~/` |
| `configurations.direnv: false` | `contexts[].envVars` is still allowed (stored, just not auto-loaded) |

---

## Minimal Valid Config (post-002)

```json
{
  "$schema": "https://tilde.sh/config-schema/v1.json",
  "version": "1",
  "schemaVersion": 1,
  "os": "macos",
  "shell": "zsh",
  "packageManager": "homebrew",
  "versionManagers": [],
  "languages": [],
  "workspaceRoot": "~/Developer",
  "dotfilesRepo": "~/Developer/personal/dotfiles",
  "contexts": [
    {
      "label": "personal",
      "path": "~/Developer/personal",
      "git": { "name": "Your Name", "email": "you@example.com" },
      "authMethod": "gh-cli"
    }
  ],
  "tools": [],
  "configurations": {
    "git": true,
    "vscode": false,
    "aliases": false,
    "osDefaults": false,
    "direnv": true
  },
  "secretsBackend": "1password"
}
```

---

## Schema Migration

### Version field semantics

| Field | Type | Purpose |
|-------|------|---------|
| `version` | `"1"` string literal | Config format edition; matches `$schema` URL |
| `schemaVersion` | integer ≥ 1 | Migration version; compared numerically at load time |

### Migration behaviour at load time

1. **Read `schemaVersion`** from raw JSON. If absent → treat as 1 (FR-020).
2. **Compare to `CURRENT_SCHEMA_VERSION`** constant in `src/config/migrations/runner.ts`.
3. **If equal** → no migration; proceed to Zod validation.
4. **If lower** → run applicable steps in ascending order (FR-015); write migrated config
   back atomically (FR-016); notify user with old and new version numbers.
5. **If higher** → warn user that config was written by a newer tilde version; proceed
   without modifying the file (FR-018).
6. **If migration step throws** → preserve original file unmodified; warn user; offer to
   re-run wizard (FR-017).

### Adding a migration step

1. Create `src/config/migrations/v{N}-to-v{N+1}.ts` with a pure `MigrationStep` function.
2. Register it in the `MIGRATIONS` map in `src/config/migrations/runner.ts`:
   `MIGRATIONS.set(N, vNToVN1);`
3. Increment `CURRENT_SCHEMA_VERSION` in `runner.ts`.
4. Add a unit test in `tests/unit/config/migration-runner.test.ts`.

Migration functions live at `src/config/migrations/v{N}-to-v{N+1}.ts`.
