# Research: Wizard UX & CLI Interaction Improvements

**Branch**: `008-wizard-ux-enhancements`
**Phase**: 0 — Research
**Date**: 2026-04-01

---

## 1. Wizard Navigation State Machine

### Decision
Implement a step history stack in `modes/wizard.tsx`. Each step has associated state (form values). Navigating back pops the stack and re-renders the previous step with its saved values. Optional steps carry a `required: false` metadata flag and render a visible skip action.

### Rationale
Ink renders one component at a time — the wizard is already a sequential state machine driven by a `currentStep` index. Replacing the single index with a `StepHistory` stack (array of `{ stepIndex, values }`) is the minimal change that enables back navigation without re-architecting the wizard. This pattern is used by Inquirer.js and similar CLI wizard libraries.

### Alternatives Considered
- **Full re-render from config snapshot**: would require persisting partial config state to disk on every step — complex and fragile.
- **Separate "edit mode" routes**: would duplicate step components; rejected in favor of reusing the same step components with pre-populated values.

---

## 2. Browser Detection on macOS

### Decision
Detect installed browsers by checking for known `.app` bundle paths in `/Applications/` and `~/Applications/`. This is synchronous, zero-dependency, and works on a fresh machine with no Homebrew required.

### Known Paths

| Browser | Bundle Path |
|---------|------------|
| Safari | `/Applications/Safari.app` (always present) |
| Google Chrome | `/Applications/Google Chrome.app` |
| Firefox | `/Applications/Firefox.app` |
| Arc | `/Applications/Arc.app` |
| Brave | `/Applications/Brave Browser.app` |
| Microsoft Edge | `/Applications/Microsoft Edge.app` |

### Rationale
`mdfind`/`mdls` are macOS-only Spotlight APIs and can be disabled by the user. Homebrew's `brew list --cask` only finds Homebrew-managed installs (misses manually installed browsers). App bundle path checks are the most reliable cross-install-method approach.

### Alternatives Considered
- **`brew list --cask`**: misses non-Homebrew installs; rejected.
- **`mdfind kMDItemContentType == "com.apple.application-bundle"`**: too broad, requires Spotlight indexing; rejected.

---

## 3. Browser Default-Setting on macOS

### Decision
Use the `defaultbrowser` Homebrew formula (`brew install defaultbrowser`) to set the default browser. The tool invokes the macOS `LSSetDefaultHandlerForURLScheme` API, which triggers the system confirmation dialog. tilde installs `defaultbrowser` automatically if it is not present when the user requests a default browser change.

### Known `defaultbrowser` IDs

| Browser | ID |
|---------|-----|
| Safari | `safari` |
| Chrome | `chrome` |
| Firefox | `firefox` |
| Arc | `arc` |
| Brave | `brave` |
| Edge | `edge` |

### Rationale
macOS intentionally gates default browser changes behind a user-confirmation dialog. There is no public API to bypass it silently. `defaultbrowser` is the most widely used CLI wrapper for this workflow. tilde cannot suppress the dialog — the spec acknowledges this and FR-009 requires clear messaging.

### Alternatives Considered
- **AppleScript `open location`**: does not set default; just opens a URL; rejected.
- **`SwiftDefaultApps`**: GUI-only; rejected.
- **Direct `LSSetDefaultHandlerForURLScheme` via `osascript`**: equivalent to `defaultbrowser` internals but requires more boilerplate; rejected in favor of the maintained CLI tool.

---

## 4. Language Version Switching Per Context (vfox)

### Decision
When a workspace context is activated (user `cd`s into the context directory), the existing `cd-hook.ts` shell hook runs. Extend it to also call the version manager's `use` command for each language binding configured on the context. For vfox: write a `.vfox.json` (or equivalent) to the context directory root. For nvm: write a `.nvmrc` file. The version manager's own shell hook then picks up the file and activates the correct version.

### Rationale
Both vfox and nvm support directory-scoped version files that their shell hooks automatically honour. This means tilde does not need to call `vfox use` or `nvm use` directly — it only needs to write the correct version file to the context directory. This keeps the activation mechanism within the version manager's own responsibility and makes it idempotent by default.

### File Format

| Version Manager | File | Format |
|----------------|------|--------|
| vfox | `.vfox.json` | `{ "nodejs": "22.0.0", "java": "21.0.0" }` |
| nvm | `.nvmrc` | `22` (single runtime only) |
| mise / asdf | `.tool-versions` | `nodejs 22.0.0\njava 21.0.0` |

### Alternatives Considered
- **Shell function calling `vfox use` on every `cd`**: would override globally, not per-directory; rejected.
- **tilde-managed env vars in `.envrc`**: would require re-generating `.envrc` on every version change; fragile with manual edits; rejected.

---

## 5. Homebrew AI Tools Discovery

### Decision
Maintain a curated list of known AI coding tools with their Homebrew formula/cask identifiers. At wizard step load time, query `brew list --formula` and `brew list --cask` once (cached for the wizard session) to determine which are installed. Do not query the Homebrew API at runtime — that would introduce a network dependency at step-render time.

### Curated AI Tools List

| Display Name | Variant Label | Homebrew ID | Type |
|--------------|--------------|-------------|------|
| GitHub Copilot CLI | CLI extension | `gh` + `gh extension install github/gh-copilot` | formula + extension |
| Claude Code | CLI tool | `claude-code` | formula (if published) / npm install |
| Claude Desktop | Desktop app | `claude` | cask |
| Cursor | Editor / AI | `cursor` | cask |
| Codeium (Windsurf) | Desktop app | `windsurf` | cask |
| Continue | VS Code extension | install via editor step | extension |

### Rationale
Runtime Homebrew API queries are slow (network) and unnecessary for a curated first-party list. The list is maintained in the tilde source; new tools are added via constitution amendment (per Principle VIII). This matches how browsers and package managers are handled elsewhere in tilde.

### Alternatives Considered
- **Live `brew search` at step load**: network-dependent, slow, returns too many irrelevant results; rejected.
- **npm registry query for `tilde-plugin-ai-*`**: appropriate for community plugins but not for first-party step; deferred to plugin registry phase.

---

## 6. Config Auto-Discovery

### Decision
When `--config` is not provided, tilde searches for `tilde.config.json` in this priority order:
1. Current working directory (`./tilde.config.json`)
2. User config directory (`~/.config/tilde/tilde.config.json`)
3. Home directory (`~/tilde.config.json`)

If found: display config summary and prompt for confirmation before applying (per Principle IV).
If not found: display a clear error message with the exact command to use (`tilde --config <path>`) and exit without launching the wizard.

### Rationale
Standard config discovery order used by tools like ESLint, Prettier, and ripgrep. The home directory fallback matches the documented behaviour for dotfiles-repo users who keep their config at `~/`.

### Alternatives Considered
- **Always require `--config`**: too strict for users who keep config at `~/`; rejected.
- **Auto-discover and silently apply**: violates Principle I (no silent state mutations); rejected.
