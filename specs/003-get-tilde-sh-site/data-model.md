# Data Model: thingstead.io/tilde Documentation & Download Site

**Branch**: `003-get-tilde-sh-site` | **Date**: 2026-03-29

> This feature is a static site + shell script. There is no database or persistent
> server state. The "data model" describes the content structure and the install
> script's runtime data flow.

---

## 1. Site Structure (Content Entities)

### Landing Page (`thingstead.io/tilde`)

```
LandingPage
├── headline: string          — one-sentence description of tilde
├── installCommand: string    — "curl -fsSL https://thingstead.io/tilde/install.sh | bash"
├── installMethods: Method[]  — list of all supported install methods
│   └── Method
│       ├── label: string     — e.g., "curl (recommended)", "npm", "npx"
│       ├── command: string   — the copyable install command
│       └── platform: string  — "macOS" | "Linux" | "All"
├── docsLink: url             — https://thingstead.io/tilde/docs/getting-started
└── repoLink: url             — https://github.com/jwill824/tilde
```

### Documentation Site (`thingstead.io/tilde/docs`)

```
DocsSite
├── navigation: NavItem[]     — sidebar tree
│   └── NavItem
│       ├── label: string
│       ├── href: string
│       └── children?: NavItem[]
└── pages: DocPage[]

DocPage
├── slug: string              — URL path (e.g., "getting-started")
├── title: string
├── description: string       — used in <meta> and search index
├── section: string           — "guides" | "reference" | "install"
└── content: Markdown         — body content
```

**Initial pages** (v1 scope):

| Slug | Title | Section |
|------|-------|---------|
| `index` | Welcome to tilde | guides |
| `installation` | Installation | install |
| `getting-started` | Getting Started | guides |
| `config-reference` | Configuration Reference | reference |

---

## 2. Install Script Runtime Data Flow

The install script has no persistent state — it reads environment, writes to PATH/shell
profile, and exits. The following describes the data it reads, transforms, and emits.

### Inputs (read at runtime)

```
ScriptInputs
├── uname_s: string           — OS detection ("Darwin" | "Linux" | other)
├── uname_m: string           — CPU arch ("arm64" | "x86_64")
├── existing_brew: bool       — result of `command -v brew`
├── existing_node: bool       — result of `command -v node` + version check
├── existing_node_version: semver | null
├── user_pm_choice: enum      — selected from interactive prompt
│   └── "homebrew" | "apt" | "dnf" | "pacman" | "skip"
└── network_available: bool   — inferred from npm registry query success
```

### Resolved at runtime

```
ScriptResolved
├── tilde_version: semver     — from `npm view @jwill824/tilde version`
├── dist_integrity: string    — from `npm view @jwill824/tilde@<v> dist.integrity`
│                               format: "sha512-<base64>"
└── node_install_path: path   — arch-specific brew opt path (if installed)
```

### Outputs (written to system)

```
ScriptOutputs
├── homebrew_installed: bool         — Homebrew present in PATH after script
├── node_installed: bool             — Node.js 20+ present in PATH after script
├── tilde_installed: bool            — `tilde` command available globally
├── exit_code: 0 | 1                 — 0 = success, 1 = any failure
└── messages: ProgressMessage[]      — printed to stdout/stderr during execution
    └── ProgressMessage
        ├── level: "info" | "success" | "warn" | "error"
        └── text: string
```

### State Transitions

```
[START]
  │
  ▼
[OS CHECK] ── non-macOS + non-Linux ──► [ABORT: unsupported OS]
  │
  ▼
[XCODE CLT CHECK] ── missing ──► [INSTALL XCODE CLT] ──► [EXIT 0: re-run after install]
  │ (macOS only)
  ▼
[PACKAGE MANAGER PROMPT] ── user selects PM
  │
  ▼
[PM INSTALL CHECK] ── not installed ──► [INSTALL PM] ── fail ──► [ABORT]
  │
  ▼
[NODE CHECK] ── node 20+ present ──► [SKIP NODE INSTALL]
  │                                          │
  └── not present ──► [INSTALL NODE via PM] ─┘
                              │
                              └── fail ──► [ABORT]
  │
  ▼
[VERSION RESOLVE] ── npm registry unavailable ──► [ABORT: registry error]
  │
  ▼
[TILDE INSTALL] (`npm install -g @jwill824/tilde@<version>`)
  │    └── integrity verified by npm automatically (dist.integrity)
  │    └── fail (checksum mismatch / network) ──► [ABORT + CLEANUP]
  │
  ▼
[LAUNCH TILDE] (`tilde`)
  │
  ▼
[EXIT 0]
```

---

## 3. Config Reference Content Model

The `config-reference.md` page documents `tilde.config.json`. Each config key maps to:

```
ConfigEntry
├── key: string                — JSON key name (e.g., "shell", "packageManager")
├── type: string               — value type (e.g., "string", "object", "array")
├── required: bool
├── validValues: string[]      — enumerated options if applicable
├── default: string | null     — default if pre-selected or null if no default
├── description: string        — plain-English explanation
├── example: JSON              — minimal example snippet
└── since: semver              — tilde version when this key was introduced
```

**Top-level keys to document** (sourced from Zod schema in `src/config/`):

| Key | Type | Notes |
|-----|------|-------|
| `schemaVersion` | string | Required; current: `"1"` |
| `os` | string | Detected; "darwin" \| "linux" \| "windows" |
| `shell` | string | "zsh" \| "bash" \| "fish" |
| `packageManager` | string | "homebrew" \| "winget" \| "chocolatey" |
| `versionManager` | string | "vfox" \| "nvm" \| "pyenv" \| "sdkman" |
| `languages` | object | Per-language version config |
| `workspace` | object | Directory structure config |
| `git` | object | Identity + auth method per context |
| `accounts` | array | GitHub account configs |
| `tools` | array | Additional tool installs |
| `secrets` | object | Secrets backend config |
| `browsers` | array | Browser installs |
