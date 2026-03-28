# Tasks: MVP — macOS Developer Environment Bootstrap

**Input**: Design documents from `specs/001-mvp-macos-bootstrap/`
**Branch**: `001-mvp-macos-bootstrap`
**Stack**: Node.js 20 LTS, TypeScript 5.4, Ink 6.8, Zod 4.3, execa 9.6, Vitest 2

**Organization**: Tasks grouped by user story for independent implementation and testing.
- **[P]**: Parallelizable (different files, no incomplete dependencies)
- **[USn]**: User story label (maps to spec.md)

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Bootstrapping the tilde project itself — TypeScript, tooling, base structure.

- [X] T001 Initialize Node.js project with `npm init`, configure `package.json` with name `tilde`, version `0.1.0`, `"type": "module"`, and bin entry `dist/index.js`
- [X] T002 Configure TypeScript 5.4 in `tsconfig.json` — `target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`, `strict: true`, `outDir: dist`, `rootDir: src`
- [X] T003 [P] Configure ESLint 9 with TypeScript plugin and `@typescript-eslint/recommended` ruleset in `eslint.config.js`
- [X] T004 [P] Configure Vitest 2 in `vitest.config.ts` — include `tests/**/*.test.ts`, globals enabled, environment `node`
- [X] T005 [P] Add `package.json` scripts: `build` (tsc), `dev` (ts-node/esm src/index.tsx), `test` (vitest), `test:integration` (vitest --config vitest.integration.config.ts), `test:contract` (vitest --config vitest.contract.config.ts), `lint` (eslint src)
- [X] T006 Create full directory structure per plan.md: `src/steps/`, `src/plugins/first-party/`, `src/capture/`, `src/installer/`, `src/dotfiles/`, `src/config/`, `src/state/`, `src/modes/`, `src/ui/`, `src/utils/`, `tests/unit/`, `tests/integration/`, `tests/contract/`, `docs/`
- [X] T007 [P] Create `.gitignore` for tilde project excluding `dist/`, `node_modules/`, `*.js.map`, `coverage/`
- [X] T008 Install all production dependencies: `ink@6.8.0 ink-select-input@6.2.0 ink-text-input@6.0.0 ink-spinner@5.0.0 react@18 zod@4.3.6 execa@9.6.1 ignore@7.0.5 fast-glob@3.3.3 zod-validation-error` and dev deps: `vitest ink-testing-library typescript @types/node @types/react tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story begins.
**⚠️ CRITICAL**: All user story phases depend on this phase being complete.

- [X] T009 Create `PluginError` class and all 5 plugin interfaces (`PackageManagerPlugin`, `SecretsBackendPlugin`, `AccountConnectorPlugin`, `EnvLoaderPlugin`, `VersionManagerPlugin`) plus `TildePlugin` base and `PluginCategory` type in `src/plugins/api.ts` — exact shapes from `contracts/plugin-api.md`
- [X] T010 Create `PluginRegistry` class in `src/plugins/registry.ts` — `register()`, `get<T>()`, `getAll()` methods; static import of first-party plugins at module load
- [X] T011 [P] Create OS and architecture detection utility in `src/utils/os.ts` — `detectOS()` returning `'macos' | 'windows' | 'linux'`, `detectArch()` returning `'arm64' | 'x64'`, `assertMacOS()` throwing with clear message on wrong OS
- [X] T012 [P] Create execa shell command wrapper in `src/utils/exec.ts` — `run(file, args, opts?)` using execa array form (never string), `runWithRetry(file, args, maxRetries)` with exponential backoff, typed `ExecError` wrapping `PluginError`
- [X] T013 [P] Create gitignore pattern filter utility in `src/utils/gitignore.ts` using `ignore` package — `createFilter(patterns: string[])`, `defaultSecretPatterns` constant (`.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `secrets.*`, `node_modules/`), `isExcluded(filePath, filter)` function
- [X] T014 Create Zod v1 schema for `tilde.config.json` in `src/config/schema.ts` — all fields per `contracts/config-schema.md`; export `TildeConfigSchema`, inferred `TildeConfig` type, and `DeveloperContextSchema`; validate `contexts[].label` uniqueness with `.superRefine()`
- [X] T015 [P] Create checkpoint state schema and read/write module in `src/state/checkpoint.ts` — Zod schema for `CheckpointState` (sessionId, lastCompletedStep, partialConfig, startedAt), `loadCheckpoint()`, `saveCheckpoint()`, `clearCheckpoint()` writing to `~/.tilde/state.json` with atomic temp-file-rename writes
- [X] T016 [P] Create config reader in `src/config/reader.ts` — `loadConfig(pathOrUrl: string): Promise<TildeConfig>` that reads JSON, runs `TildeConfigSchema.safeParse()`, and throws formatted `zod-validation-error` on failure; support `~` path expansion
- [X] T017 [P] Create config writer in `src/config/writer.ts` — `writeConfig(config: TildeConfig, dotfilesRepo: string)` that serializes and writes `tilde.config.json` to `${dotfilesRepo}/tilde.config.json`; never writes if any `envVars[].value` matches known secret patterns
- [X] T018 Create root Ink entry point `src/index.tsx` — parse CLI args (`--config`, `--yes`, `--reconfigure`, `--resume`, `--dry-run`, `--version`), detect mode (config-first / prompt-first / non-interactive), call `detectOS()` + `assertMacOS()`, render `<App />` via `ink.render()`; create `src/app.tsx` shell with mode-based branch render

**Checkpoint**: Foundation ready — all user story phases may now begin.

---

## Phase 3: User Story 1 — Fresh Machine Bootstrap (Priority: P1) 🎯 MVP

**Goal**: A fresh Mac user pastes one `curl | bash` command and completes a guided wizard that
installs all selected tools, generates dotfiles, symlinks them, and writes `tilde.config.json`.

**Independent Test**: Run on a clean macOS user account. Complete wizard with: zsh, Homebrew,
vfox, one context, gh-cli auth. Verify tools installed, dotfiles symlinked, config written.

### Wizard Flow

- [X] T019 [US1] Create wizard step sequencer in `src/modes/wizard.tsx` — `useState` for `currentStep` (0–13) and accumulated `TildeConfig` partial; render current step component; use Ink `<Static>` to lock completed step output above current prompt; call `saveCheckpoint()` after each `onComplete`
- [X] T020 [P] [US1] Implement Step 00 config detection in `src/steps/00-config-detection.tsx` — check for `tilde.config.json` in cwd and common dotfiles paths; if found, display path and offer config-first mode; `onComplete({ mode: 'wizard' | 'config-first', configPath? })`
- [X] T021 [US1] Implement Step 02 shell selection in `src/steps/02-shell.tsx` — `ink-select-input` menu with `['zsh', 'bash', 'fish']`; MVP pre-selects `zsh`; `onComplete({ shell })`
- [X] T022 [US1] Implement Step 03 package manager selection in `src/steps/03-package-manager.tsx` — macOS shows only `['homebrew']` (MVP); `onComplete({ packageManager })`
- [X] T023 [P] [US1] Implement Step 04 version manager selection in `src/steps/04-version-manager.tsx` — multi-select from `['vfox', 'nvm', 'pyenv', 'sdkman']`; allow empty selection; `onComplete({ versionManagers })`
- [X] T024 [P] [US1] Implement Step 05 languages + versions in `src/steps/05-languages.tsx` — shown only if version managers selected; per-manager language + version text inputs; `onComplete({ languages })`
- [X] T025 [US1] Implement Step 06 workspace root in `src/steps/06-workspace.tsx` — `ink-text-input` defaulting to `~/Developer`; validate path is absolute or `~`-prefixed; `onComplete({ workspaceRoot, dotfilesRepo })`
- [X] T026 [US1] Implement Step 07 contexts definition in `src/steps/07-contexts.tsx` — add/remove named contexts; each context collects: label, path (under workspaceRoot), git name, git email; loop until user confirms; validate label uniqueness; `onComplete({ contexts })`
- [X] T027 [US1] Implement Step 08 git auth method in `src/steps/08-git-auth.tsx` — per context, select `['gh-cli', 'https', 'ssh']`; MVP defaults to `gh-cli`; `onComplete({ contexts })` with authMethod set
- [X] T028 [P] [US1] Implement Step 09 additional tools in `src/steps/09-tools.tsx` — `ink-text-input` for comma-separated Homebrew formula names; direnv pre-checked per FR-006; `onComplete({ tools, configurations: { direnv } })`
- [X] T029 [P] [US1] Implement Step 10 app configurations in `src/steps/10-app-config.tsx` — multi-select enabled config domains: `git`, `vscode`, `aliases`, `osDefaults`; `onComplete({ configurations })`
- [X] T030 [P] [US1] Implement Step 11 account connections in `src/steps/11-accounts.tsx` — for each context with `gh-cli` auth, prompt GitHub username; `onComplete({ contexts })` with github.username set
- [X] T031 [US1] Implement Step 12 secrets backend in `src/steps/12-secrets-backend.tsx` — select from `['1password', 'keychain', 'env-only']`; MVP defaults to `1password`; `onComplete({ secretsBackend })`
- [X] T032 [US1] Implement Step 13 config export + completion summary in `src/steps/13-config-export.tsx` — display full config summary in Ink Box; confirm prompt; on confirm call `writeConfig()`; display success with dotfilesRepo path; `onComplete({ done: true })`

### First-Party Plugins

- [X] T033 [P] [US1] Implement Homebrew plugin in `src/plugins/first-party/homebrew/index.ts` — `isAvailable()` via `brew --version`, `install()` via official Homebrew install script URL, `installPackages()` via `brew install [...args]` with installed/skipped/failed result, `listInstalled()` via `brew list -1`; export `export default new HomebrewPlugin()`
- [X] T034 [P] [US1] Implement gh-cli account connector plugin in `src/plugins/first-party/gh-cli/index.ts` — `isAvailable()`, `connect(username)` via `gh auth login --web`, `switchAccount(username)` via `gh auth switch --user`, `currentAccount()` via `gh auth status --json`, `generateShellHook(contexts)` returning zsh `cd()` function with `gh auth switch` per context path pattern
- [X] T035 [P] [US1] Implement 1Password secrets backend plugin in `src/plugins/first-party/onepassword/index.ts` — `isAvailable()` via `op --version`, `generateReference({ vault, item, field })` returning `op://vault/item/field` string, `validate()` via `op account list`, `getRuntimeInitCode()` returning `'eval "$(op signin)"'`
- [X] T036 [P] [US1] Implement direnv env loader plugin in `src/plugins/first-party/direnv/index.ts` — `isAvailable()`, `install()` via homebrew plugin, `generateEnvrc({ envVars, secretsBackend })` producing `.envrc` content with backend references (never resolved values), `generateShellHook('zsh')` returning `eval "$(direnv hook zsh)"`
- [X] T037 [P] [US1] Implement vfox version manager plugin in `src/plugins/first-party/vfox/index.ts` — `isAvailable()`, `install()`, `installVersion(lang, ver)`, `useVersion(lang, ver)`, `listInstalled(lang)`, `generateShellHook('zsh')`; `supportedLanguages: ['node', 'python', 'java', 'go', 'rust']`

### Dotfiles & Installation

- [X] T038 [US1] Create idempotent symlink creator in `src/dotfiles/symlinks.ts` — `createSymlink(src, dest)`: if dest already exists and is correct symlink skip; if dest is wrong symlink or file prompt user; use `fs.symlink()` with `ln -sf` semantics; `batchCreateSymlinks(pairs)`
- [X] T039 [US1] Create dotfiles file writer in `src/dotfiles/writer.ts` — `writeManagedFile(dotfilesRepo, relativePath, content)` writes content to dotfiles repo then calls `createSymlink`; `writeAll(config)` orchestrates all managed files for a full config
- [X] T040 [US1] Create git config generator in `src/dotfiles/gitconfig.ts` — `generateGlobalGitconfig(config)` producing `[credential]` helper + `[includeIf "gitdir:..."]` blocks per context; `generateContextGitconfig(context)` producing `[user] name/email`; both written to dotfiles repo and symlinked
- [X] T041 [P] [US1] Create shell profile generator in `src/dotfiles/shellprofile.ts` — `generateZshrc(config, plugins)` producing `.zshrc` with: version manager hook, direnv hook (if enabled), cd function for gh auth switching (if gh-cli contexts), aliases source line; idempotent marker comments around each inserted block
- [X] T042 [US1] Create package installer orchestrator in `src/installer/index.ts` — `installAll(config, registry)` calls active `PackageManagerPlugin.installPackages(config.tools)`; shows `ink-spinner` during install; surfaces `PluginError` to Ink error display; calls version manager plugin per language in `config.languages`
- [X] T043 [US1] Complete `bootstrap.sh` implementation — `set -euo pipefail`; detect macOS + arm64; check Xcode CLT; check Node 20+ (`node --version`); if absent install via Homebrew (install Homebrew first if needed); then run `npx --yes tilde@latest`; clean up temp files
- [X] T044 [US1] Register all first-party plugins in `src/plugins/registry.ts` — static imports of homebrew, gh-cli, onepassword, direnv, vfox; call `registry.register()` for each; export singleton `pluginRegistry`

### Error Handling & Tests

- [X] T045 [P] [US1] Create Ink `PluginError` display component in `src/ui/error-display.tsx` — renders `PluginError` in red bordered Box with pluginId, message, code, and severity; shows recovery options (retry/skip/abort) via `ink-select-input`; calls `onRecover(choice)` callback
- [X] T046 [P] [US1] Write contract test for `PackageManagerPlugin` in `tests/contract/package-manager.contract.ts` — shared test suite asserting interface shape; run against homebrew plugin with `vi.mock` for `execa`
- [X] T047 [P] [US1] Write contract test for `SecretsBackendPlugin` in `tests/contract/secrets-backend.contract.ts` — assert `generateReference` never returns a resolved value; mock `op` CLI calls
- [X] T048 [P] [US1] Write contract test for `AccountConnectorPlugin` in `tests/contract/account-connector.contract.ts` — assert `generateShellHook` output contains correct path patterns for each context
- [X] T049 [P] [US1] Write unit tests for `src/config/schema.ts` in `tests/unit/config-schema.test.ts` — valid minimal config passes; missing required fields fail with correct path; duplicate context labels fail; env var with `ghp_` prefix fails validation
- [X] T050 [P] [US1] Write unit tests for `src/state/checkpoint.ts` in `tests/unit/checkpoint.test.ts` — save checkpoint persists to disk; load reads back correctly; clear removes file; atomic write (partial write does not corrupt)
- [X] T051 [US1] Write integration test for full wizard flow in `tests/integration/wizard-flow.test.ts` — use `ink-testing-library` to render full `<App />`; simulate keyboard through all 14 steps; assert `tilde.config.json` written to temp dir with all choices; assert symlinks created

---

## Phase 4: User Story 2 — Existing Machine Capture (Priority: P2)

**Goal**: An existing developer runs tilde and their current environment (packages, dotfiles,
rc files) is detected and pre-populates the wizard defaults.

**Independent Test**: Run on a Mac with existing Homebrew, `.zshrc`, `.gitconfig`. Verify
detected values appear as wizard defaults and `.env` files are excluded.

- [ ] T052 [US2] Create environment scanner in `src/capture/scanner.ts` — `scanDotfiles(homeDir)` using fast-glob to find `~/.*` files (depth 1); `scanBrewPackages()` running `brew list -1`; `scanRcFiles(dotfiles)` reading `.zshrc`, `.zshprofile`, `.gitconfig`; assemble into `EnvironmentCaptureReport`
- [ ] T053 [P] [US2] Create gitignore-based file filter in `src/capture/filter.ts` — `createCaptureFilter()` using `ignore` package seeded with `defaultSecretPatterns` from `src/utils/gitignore.ts`; `filterDotfiles(paths, filter)` removes excluded files; log skipped paths for transparency
- [ ] T054 [P] [US2] Create RC file content parser in `src/capture/parser.ts` — `parseZshrc(content)` extracting aliases (`alias foo=...`), exports (`export VAR=val`) filtering non-secret values, sourced files; `parseGitconfig(content)` extracting `[user]` name/email; `parseGitconfigIncludes(content)` extracting `includeIf` paths
- [ ] T055 [US2] Implement full Step 01 env capture in `src/steps/01-env-capture.tsx` — offer to scan; run `scanner.ts` + `filter.ts`; display summary (N packages, N dotfiles, N rc entries found, N files excluded); confirm to use as defaults; `onComplete({ captureReport })`
- [ ] T056 [US2] Wire capture report into wizard pre-population in `src/modes/wizard.tsx` — after Step 01 completes, map `captureReport` fields to wizard `initialValues` for Steps 02–09; pre-populate detected shell, detected Homebrew packages, detected git identity
- [ ] T057 [P] [US2] Write unit tests for `src/capture/scanner.ts` in `tests/unit/capture-scanner.test.ts` — mock filesystem with tmp dir; assert dotfiles detected; assert `brew list` output parsed; assert rc files read
- [ ] T058 [P] [US2] Write unit tests for `src/capture/filter.ts` in `tests/unit/capture-filter.test.ts` — `.env` excluded; `.gitconfig` included; `*.pem` excluded; `.zshrc` included; negation pattern test
- [ ] T059 [P] [US2] Write unit tests for `src/capture/parser.ts` in `tests/unit/rc-parser.test.ts` — aliases parsed correctly; exports with secret-looking values excluded; gitconfig `[user]` parsed; `includeIf` paths extracted
- [ ] T060 [US2] Write integration test for env capture flow in `tests/integration/env-capture.test.ts` — create fixture home dir with `.zshrc`, `.gitconfig`, Homebrew list mock, `.env` file; run capture; assert report contains expected entries; assert `.env` excluded from report

---

## Phase 5: User Story 3 — Config-First Restore (Priority: P3)

**Goal**: A developer provides a `tilde.config.json` (from a previous run), tilde displays a
summary and applies the full setup without re-running the wizard.

**Independent Test**: Take a valid `tilde.config.json` from a Story 1 run. Run
`tilde install --config path/to/config.json`. Verify identical environment state, zero prompts
for already-answered fields.

- [ ] T061 [US3] Create config-first mode in `src/modes/config-first.tsx` — load + validate config via `src/config/reader.ts`; render `<ConfigSummary config={...} />`; confirm prompt; on confirm run `installer/index.ts` + `dotfiles/writer.ts` in same order as wizard apply; `onComplete()`
- [ ] T062 [P] [US3] Create config summary Ink component in `src/ui/config-summary.tsx` — render `TildeConfig` as formatted Ink Box tree: OS/shell/packageManager row, contexts table (label + path + git email + authMethod), tools list, configurations enabled, secretsBackend
- [ ] T063 [P] [US3] Create schema migration stub in `src/config/migrations/v1.ts` — `migrateConfig(raw, fromVersion)` returning migrated object; currently a no-op for v1→v1; structure allows `v1-to-v2.ts` to be added later; `reader.ts` calls this before schema validation
- [ ] T064 [US3] Wire `--config` flag into entry point in `src/index.tsx` — if `--config` provided: load config via `reader.ts`, branch to `<ConfigFirstMode />`; if `tilde.config.json` found in cwd: offer choice between wizard and config-first; update `src/app.tsx` to render `<ConfigFirstMode />` branch
- [ ] T065 [US3] Implement partial config prompting in `src/modes/config-first.tsx` — if `safeParse` fails with missing fields, render targeted prompts for only the missing fields using existing step components; merge answers into config; re-validate before proceeding
- [ ] T066 [P] [US3] Write unit tests for config-first mode in `tests/unit/config-first.test.ts` — complete valid config → no prompts; config with missing `contexts` → context step rendered; invalid field → error displayed with field path
- [ ] T067 [P] [US3] Write unit tests for config validation error display in `tests/unit/config-validation.test.ts` — assert `zod-validation-error` formatting produces human-readable messages; assert secret-pattern validator rejects `ghp_*` values in envVars
- [ ] T068 [US3] Write integration test for config-first full apply in `tests/integration/config-first.test.ts` — fixture `tilde.config.json` from Story 1 test; run config-first mode against temp dir; assert same files created as wizard run; assert zero interactive prompts rendered

---

## Phase 6: User Story 4 — Context-Aware Environment Switching (Priority: P4)

**Goal**: After setup, `cd`-ing into a context directory automatically switches git identity,
GitHub account, and environment variables — no manual commands needed.

**Independent Test**: Configure two contexts with different git identities. `cd` into each
context directory; run `git config user.email`; verify correct identity per context.

- [X] T069 [US4] Create shell cd hook generator in `src/dotfiles/cd-hook.ts` — `generateCdHook(contexts, accountPlugin)` producing zsh `function cd()` that pattern-matches `$PWD` against each context path, calls `gh auth switch --user` for gh-cli contexts; integrated into `shellprofile.ts`
- [X] T070 [P] [US4] Update gh-cli plugin `generateShellHook()` in `src/plugins/first-party/gh-cli/index.ts` — accept full `DeveloperContext[]`; produce complete cd function body with all context cases + fallback to default context
- [X] T071 [US4] Update direnv plugin `generateEnvrc()` in `src/plugins/first-party/direnv/index.ts` — include `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, `GIT_COMMITTER_EMAIL` exports per context (from `context.git`); reference secrets via backend
- [X] T072 [P] [US4] Update git config generator in `src/dotfiles/gitconfig.ts` — ensure global `~/.gitconfig` has `[includeIf "gitdir:~/path/"]` for each context pointing to `${dotfilesRepo}/git/.gitconfig-${label}`; validate no overlapping paths
- [X] T073 [P] [US4] Write unit tests for cd hook generation in `tests/unit/cd-hook.test.ts` — two contexts → cd function contains both path cases; default context case present; no context match → default context active
- [X] T074 [P] [US4] Write unit tests for gitconfig includeIf generation in `tests/unit/gitconfig.test.ts` — two contexts → two `includeIf` blocks in global config; correct email in each context config; overlapping paths throw validation error
- [X] T075 [US4] Write integration test for context switching in `tests/integration/context-switch.test.ts` — create temp dirs matching context paths; run dotfiles writer with two-context config; `execSync('git config user.email')` in each dir; assert correct identity per context

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Non-functional completeness, CLI ergonomics, and constitution compliance.

- [ ] T076 Wire checkpoint/resume into `src/modes/wizard.tsx` — on startup check for existing `~/.tilde/state.json`; if `lastCompletedStep > -1` offer resume; on resume restore `partialConfig` and jump to `lastCompletedStep + 1`; clear checkpoint on wizard completion (FR-018)
- [ ] T077 [P] Add idempotency guards to `src/dotfiles/symlinks.ts` and `src/dotfiles/writer.ts` — before any write/symlink: check current state; skip if already correct; log "already configured" for skipped items; run twice on same config produces zero changes (SC-003)
- [ ] T078 [P] Write `docs/config-format.md` — human-readable documentation of `tilde.config.json` format per constitution Principle I; include all fields, types, examples, schema version note, and link to JSON Schema URL
- [ ] T079 [P] Implement `--yes` / `--ci` non-interactive mode in `src/index.tsx` — requires `--config`; skips all prompts; exits with code 3 if any required field missing; `TILDE_CI` env var equivalent
- [ ] T080 [P] Implement `--dry-run` mode in `src/installer/index.ts` and `src/dotfiles/writer.ts` — print all planned actions (packages to install, symlinks to create, files to write) without executing; exit 0
- [ ] T081 Implement `tilde context` subcommand in `src/index.tsx` — `list` prints all contexts from active config; `current` shows active context based on `$PWD`; `switch <label>` manually calls account connector switchAccount
- [ ] T082 [P] Implement `tilde plugin` subcommand in `src/index.tsx` — `list` renders registered plugins with source/version; `add <name>` runs `npm install tilde-plugin-<name>` and registers; `remove <name>` uninstalls
- [ ] T083 [P] Implement `tilde config` subcommand in `src/index.tsx` — `validate [path]` loads and validates config printing field-level errors; `show [path]` pretty-prints active config; `edit` opens `$EDITOR`
- [ ] T084 [P] Implement all exit codes in `src/index.tsx` per `contracts/cli-commands.md` — 0 success, 1 general error, 2 schema validation failure, 3 missing field in CI mode, 4 plugin error, 5 user cancelled
- [ ] T085 [P] Add `TILDE_CONFIG`, `TILDE_STATE_DIR`, `TILDE_NO_COLOR`, `TILDE_CI` environment variable support in `src/index.tsx` — read at startup before arg parsing; `TILDE_NO_COLOR` disables Ink color output
- [ ] T086 [P] Implement VS Code profile configuration domain in `src/dotfiles/vscode.ts` — `generateVscodeSettings(context)` writing `settings.json` to the named VS Code profile directory per context; write if `configurations.vscode` enabled
- [ ] T087 [P] Implement macOS defaults stub in `src/dotfiles/osdefaults.ts` — `applyOsDefaults(config)` reads a `defaults.json` from dotfiles repo and runs `defaults write` commands if `configurations.osDefaults` enabled; MVP stub that logs "no defaults configured" if file absent
- [ ] T088 Write end-to-end integration test for fresh machine simulation in `tests/integration/fresh-machine.test.ts` — temp home dir with no prior tooling mocks; run full wizard via `ink-testing-library`; assert all Story 1 acceptance scenarios pass; assert `tilde.config.json` written with all choices
- [ ] T089 [P] Run `quickstart.md` validation — execute each code block in `specs/001-mvp-macos-bootstrap/quickstart.md` against the built project; confirm `npm install`, `npm run build`, `npm test` all succeed
- [ ] T090 [P] Security audit: scan all file write paths in `src/dotfiles/` and `src/config/writer.ts` — assert no code path writes a string matching `/^(ghp_|sk-|AKIA|op:\/\/).*[A-Za-z0-9]{20}/` directly to disk; add a unit test asserting this invariant

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user story phases**
- **Phase 3 (US1)**: Depends on Phase 2 — MVP deliverable, most critical path
- **Phase 4 (US2)**: Depends on Phase 2 — independent of Phase 3 (uses same scanner/filter)
- **Phase 5 (US3)**: Depends on Phase 2 + Phase 3 (needs config writer + apply logic)
- **Phase 6 (US4)**: Depends on Phase 3 (needs dotfiles writer, context model, plugins)
- **Phase 7 (Polish)**: Depends on all story phases complete

### User Story Dependencies

```
Phase 1 → Phase 2 → Phase 3 (US1) ─┬─────────────────────────────→ Phase 7
                  ↓                 ├──→ Phase 4 (US2) ────────────→ Phase 7
                  └─────────────────┴──→ Phase 5 (US3, needs US1) → Phase 7
                                    └──→ Phase 6 (US4, needs US1) → Phase 7
```

### Within Each User Story

- Plugin contracts before plugin implementations
- Schema before config reader/writer
- Wizard step components before sequencer wiring
- Dotfiles generators before installer orchestrator
- Unit tests before integration tests

---

## Parallel Opportunities

### Phase 2: Foundational (run in parallel after T009)

```
T009 (plugin API) is a blocker → then all of T010–T018 can run in parallel groups:
  Group A (utils): T011, T012, T013
  Group B (config): T014, T015, T016, T017
  Group C (entry): T018 (after T014)
```

### Phase 3: User Story 1 (run in parallel groups)

```
After T019 (sequencer):
  Group A (steps): T020–T032 in parallel (different files)
  Group B (plugins): T033–T037 in parallel (different plugin dirs)
  Group C (dotfiles): T038–T042 in parallel (different dotfile modules)
  Group D (tests): T046–T050 in parallel (different test files)
T043 (bootstrap.sh) and T044 (registry) after all plugins done
T051 (integration test) last in US1
```

### Phase 4: User Story 2 (fully parallelizable internally)

```
T052 → T053, T054 in parallel
T055 after T052–T054
T056 after T055
T057, T058, T059 in parallel
T060 after T057–T059
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup)
2. Complete Phase 2 (Foundational) — **do not skip**
3. Complete Phase 3 (User Story 1)
4. **STOP and VALIDATE**: Run Story 1 independent test on a clean macOS account
5. Demo / release if ready

### Incremental Delivery

1. Setup + Foundational → project compiles and tests run
2. + User Story 1 → end-to-end bootstrap wizard works **(MVP)**
3. + User Story 2 → existing machines can capture their environment
4. + User Story 3 → config-first restore closes the reproducibility loop
5. + User Story 4 → context-aware switching works daily
6. + Polish → production-ready CLI

### Parallel Team Strategy

Once Phase 2 is complete:
- Developer A: Phase 3 (User Story 1 — highest priority, critical path)
- Developer B: Phase 4 (User Story 2 — independent scanner/capture work)
- Developer C: Phase 5 (User Story 3 — builds on US1 apply logic, coordinate)

---

## Notes

- All `[P]` tasks touch different files — safe to run in parallel within the same phase
- `[USn]` label maps each task to its user story for traceability and independent testing
- Checkpoint/resume (T076) is in Polish but FR-018 safety net exists from T015 — wire last
- Each story phase is independently completable; do not mix US1 and US2 implementation
- Commit after each task or logical group; run `npm test` after each commit
- `contracts/plugin-api.md` is the source of truth for all plugin interface implementations
