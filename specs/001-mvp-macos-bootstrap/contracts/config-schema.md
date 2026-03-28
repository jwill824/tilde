# Contract: tilde.config.json Schema

Schema version: **v1**
JSON Schema: `https://tilde.sh/config-schema/v1.json` *(published at release)*

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
  version: "1";                          // Required. Schema version.
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
| `contexts[].label` | Unique within the `contexts` array |
| `contexts[].path` | Must not overlap with another context's path |
| `contexts[].authMethod` | Must be one of the three enum values |
| `contexts[].envVars[].value` | MUST NOT match `/^(ghp_|sk-|AKIA|xox[bp]-)/` — these look like raw secrets |
| `languages[].manager` | Must match a `name` in `versionManagers` array |
| `dotfilesRepo` | Must be an absolute path or start with `~/` |
| `configurations.direnv: false` | `contexts[].envVars` is still allowed (stored, just not auto-loaded) |

---

## Minimal Valid Config

```json
{
  "$schema": "https://tilde.sh/config-schema/v1.json",
  "version": "1",
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

Schema version is recorded in the `version` field. When loading a config, tilde checks
`version` against the current supported schema version. If older:
- tilde attempts automatic migration (additive changes only)
- If migration is not possible, tilde reports a clear error with the incompatible fields

Migration functions live at `src/config/migrations/v{N}-to-v{N+1}.ts`.
