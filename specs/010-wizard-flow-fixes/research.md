# Research: Wizard Flow Fixes & Enhancements

**Branch**: `010-wizard-flow-fixes` | **Date**: 2026-04-07
**Status**: Complete — all unknowns resolved

---

## R1: Ink Back-Navigation & Value Restoration

**Decision**: Pass `initialValues` prop to each step component; use lazy `useState` initializer to restore state.

**Rationale**: Ink re-mounts a component whenever the wizard decrements `currentStep` — any `useState` internal state resets to initial values. Passing `StepFrame.values` as `initialValues` at render time and consuming via lazy initializer (`useState(() => initialValues.field ?? default)`) is the idiomatic React pattern for controlled restoration. It works correctly with Ink's render cycle.

**Key finding**: `StepFrame.values: Record<string, unknown>` already exists in `wizard.tsx`. The history stack already stores values per frame. The only missing piece is the wizard not passing `frame.values` back to the component when rendering a step already in history.

**Alternatives considered**:
- Context / global state (rejected — adds complexity, breaks step isolation)
- `useRef` to preserve values across re-renders (rejected — doesn't survive unmount/remount)

---

## R2: Language Step Sequential Traversal State Loss

**Decision**: Accept `initialValues.entries` (full `LanguageEntry[]`) and `initialValues.currentIdx` as props; initialize both `useState` values from them.

**Rationale**: `src/steps/05-languages.tsx` initializes `entries` by computing `allLanguages` from `versionManagers` prop — this is deterministic but loses any version strings the user entered. `currentIdx` always resets to `0`. Accepting both as `initialValues` (from `StepFrame.values`) restores the exact mid-step state the user was in.

**Key finding**: The blank-omit logic (`.filter(e => e.version.trim())`) is already correct and must not change. The bug is purely about state initialization.

**Alternatives considered**:
- Show all languages on a single screen simultaneously (rejected — significant UI refactor, out of scope)
- Store partial progress in a checkpoint (rejected — overkill; already handled by StepFrame history)

---

## R3: Config Discovery Path Changes

**Decision**: Update `getDiscoveryPaths()` to return `[cwd, git-repo-root, ~/.tilde/tilde.config.json]`.

**Rationale**: Per spec clarification Q3. The `~/.tilde/` path is the new canonical home location (replacing `~/.config/tilde/` and `~/tilde.config.json`). Users are expected to keep a version-controlled tilde config repo and symlink `~/.tilde/tilde.config.json` from it.

**Git root detection**: Use `execa('git', ['rev-parse', '--show-toplevel'], { timeout: 1000, reject: false })`. `execa` is already a project dependency (`package.json`). On failure (not in a git repo, git unavailable, or timeout), skip this path silently. Result is deduplicated against cwd path to avoid double-searching.

**Symlink handling**: `fs.existsSync` and `fs.promises.access` follow symlinks by default on macOS — no special handling needed.

**Existing inconsistency fixed**: `src/steps/00-config-detection.tsx` has hardcoded developer-specific paths (`~/Developer/personal/dotfiles/...`). This file must be updated to use `getDiscoveryPaths()` from the shared utility.

**Alternatives considered**:
- XDG_CONFIG_HOME support (deferred — not in spec scope)
- `~/.config/tilde/` (rejected — wrong per clarification)

---

## R4: Config Discovery Prompt (Auto-Found Without `--config`)

**Decision**: Add an interactive `ConfigDiscoveryPrompt` Ink component rendered in `main()` before entering `config-first` mode. "No" → exit(0) with instruction. "Specify path" → text input.

**Rationale**: The prompt must fire before any wizard or config-first rendering. The cleanest location is `src/index.tsx` in `main()`, after `discoverConfig()` returns a non-null path when no `--config` was given. A minimal Ink render of a new `ConfigDiscoveryPrompt` component handles the interactive selection.

**Key finding**: `src/steps/00-config-detection.tsx` already exists and handles a similar UX (config found during wizard flow). However, the auto-discovery prompt fires pre-wizard, so it needs to be a standalone renderable component — either in `src/modes/` or `src/steps/`.

**Component location**: `src/steps/00-config-detection.tsx` — already exists and should be refactored to use the shared utility and handle the "no → exit with instruction" path correctly. The wizard step usage and the startup usage can both call this component.

**"No" behavior**: Print `Run tilde install --config <path> to proceed.` and `process.exit(0)` — this is a deliberate user choice, not an error.

**Alternatives considered**:
- Always silently use auto-discovered config without prompting (rejected — spec US3 requires explicit consent)
- A separate `src/modes/config-discovery-prompt.tsx` file (rejected — step 00 already serves this purpose; better to fix it than duplicate it)

---

## R5: Note-Taking Apps — Catalog & Bear App Store Case

**Decision**: Extend `src/steps/09-tools.tsx` with a note-taking sub-section using a static catalog. No new wizard step or step index needed.

**Catalog**:
| App | Homebrew Cask | Availability |
|-----|--------------|-------------|
| Obsidian | `obsidian` | Homebrew |
| Notion | `notion` | Homebrew |
| Logseq | `logseq` | Homebrew |
| Bear | — | App Store only |

**Bear handling**: Show as selectable but labelled `Bear (App Store — install manually)`. When selected, tilde adds a post-install note instead of running `brew install`. No error, no skip — the user's selection is respected and their intent is recorded in config.

**UI pattern**: `ink-select-input` is already a dependency. Multi-select pattern (space to toggle, enter to confirm) matches how other multi-select steps work in the wizard.

**Alternatives considered**:
- New dedicated wizard step (step 16) for note-taking apps (rejected — unnecessary registry/index change for 4 items)
- Free-text input like current tools step (rejected — defeats the purpose of showing availability info)

---

## R6: Tests — Mock Strategy for Git Root Detection

**Decision**: In `tests/unit/config-discovery.test.ts`, mock `execa` using `vi.mock()` to control git root detection output.

**Rationale**: Vitest (the project test runner) uses `vi.mock()` for ESM module mocking. `execa` must be mocked to avoid real subprocess calls in unit tests. Two mock scenarios: (a) inside a git repo (returns a path), (b) not in a git repo (rejects/times out).

**Pattern** (from existing test file style):
```typescript
vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '/fake/repo/root' }),
}));
```

**Alternatives considered**:
- Integration test with real git repo (rejected for unit tests — environment-dependent)
- Environment variable override for git root (rejected — adds production code complexity for test convenience)
