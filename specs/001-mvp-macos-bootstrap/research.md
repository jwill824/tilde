# Phase 0 Research: MVP — macOS Developer Environment Bootstrap

## 1. Ink Multi-Step Wizard Architecture

**Decision**: Model the wizard as a stateful step sequencer in a single root `App` component.
Each step is an independent Ink component. The root holds `currentStep` and accumulated
`config` in `useState`; each step receives an `onComplete(stepData)` callback that advances
the sequence and merges data into config. Use Ink's `<Static>` component to lock/freeze
completed step output so previous answers remain visible above the current prompt.

**Rationale**: Ink renders a single React tree — there are no "pages" or routing. The step
sequencer pattern (popularised by `create-react-app` internals) is the de-facto approach.
`<Static>` is the idiomatic Ink way to prevent re-rendering of completed steps. Keeping step
components stateless with a callback makes each independently testable with ink-testing-library.

**Current version**: Ink **6.8.0** (not 4.x — latest stable as of 2026)

**Key packages**:
- `ink` 6.8.0 — core renderer
- `ink-select-input` 6.2.0 — arrow-key menus
- `ink-text-input` 6.0.0 — text fields
- `ink-spinner` 5.0.0 — activity indicator during async operations
- `useFocus()` + `useFocusManager()` — for steps with multiple interactive elements

**Alternatives considered**: Using a state machine library (XState) was evaluated but adds
significant complexity for a linear wizard flow; deferred to a future enhancement.

---

## 2. Testing Ink Components

**Decision**: Vitest as the test runner + `ink-testing-library` for component rendering.

**Rationale**: Vitest is significantly faster than Jest for TypeScript projects and has
first-class native ESM support (Ink 6 is ESM-only). `ink-testing-library` provides `render()`
which returns `output` (the rendered string) and `stdin` for simulating keyboard input —
sufficient for all wizard step tests. Snapshot testing is fully supported.

**Version**: `ink-testing-library` 4.0, `vitest` 2.x

**Pattern**:
```ts
import { render } from 'ink-testing-library';
import { ShellStep } from '../src/steps/02-shell.js';

test('shell step renders options', () => {
  const { output, stdin } = render(<ShellStep onComplete={vi.fn()} />);
  stdin.write('\x1b[B'); // Down arrow
  stdin.write('\r');     // Enter
  expect(output).toContain('zsh');
});
```

---

## 3. Bootstrap Script Pattern

**Decision**: `bootstrap.sh` uses a two-phase approach:
1. Check for Node 20+ via `node --version`; if absent, install via the official Node install
   script or Homebrew (with a fallback to downloading the Node binary directly)
2. Once Node is available: `npx --yes tilde@latest` (or `node /tmp/tilde-bootstrap.js` for
   offline use)

**Rationale**: Projects like Homebrew, Volta, and fnm all use this pattern. `npx` handles
the npm registry fetch and caching; no manual temp-dir management required.

**Bootstrap script responsibilities**:
- Detect macOS (abort with clear message on other OS for MVP)
- Check for `curl` (always present on macOS)
- Check for Xcode Command Line Tools (required for Homebrew)
- Check Node 20+ / install if missing (via `nvm` or direct binary)
- Run `npx tilde@latest` (or `node tilde.js` if pre-downloaded)
- Clean up any temp files

**Distribution**: Hosted at `get.tilde.sh` (custom domain via Cloudflare redirect) pointing
to `https://raw.githubusercontent.com/[user]/tilde/latest/bootstrap.sh`.

---

## 4. gitignore Pattern Matching

**Decision**: Use the `ignore` npm package.

**Rationale**: `ignore` is the most widely used gitignore-compatible parser (used by ESLint,
Prettier, and Husky). It correctly handles all gitignore edge cases including negation
patterns, directory-specific rules, and nested .gitignore files. `fast-glob` is used for
the file scan itself and passes results through `ignore` for filtering.

**Usage pattern**:
```ts
import ignore from 'ignore';
const ig = ignore().add(['.env', '*.pem', '*.key', 'node_modules', ...defaults]);
const filtered = allFiles.filter(f => !ig.ignores(f));
```

**Default exclusion patterns** (tilde ships these regardless of user's .gitignore):
`.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `secrets.*`, `node_modules/`,
`.DS_Store`, `*.log`

---

## 5. Checkpoint / Resume State

**Decision**: Write `~/.tilde/state.json` after each completed wizard step.

**Rationale**: Using the user's home directory (not the project dir) ensures state persists
across directory changes. JSON is human-readable so users can inspect or reset manually.
The `conf` npm package handles atomic writes, cross-platform paths, and schema migration.

**State shape**:
```json
{
  "schemaVersion": 1,
  "sessionId": "uuid-v4",
  "startedAt": "ISO8601",
  "lastCompletedStep": 7,
  "partialConfig": { ... }
}
```

On startup: if `state.json` exists and `lastCompletedStep > 0`, offer to resume. User can
decline to start fresh (which clears state). State is deleted on successful completion.

---

## 6. Zod Config Schema Validation

**Decision**: Zod **4.3.6+** with `.safeParse()`, `zod-validation-error` for display formatting.

**Rationale**: Zod provides TypeScript type inference from schema definitions (single source
of truth), composable validators, and rich error paths. `.safeParse()` returns a
discriminated union — on failure, `error.issues` gives field-level path + message suitable
for display in the Ink UI. The `zod-validation-error` package formats Zod errors into
human-readable strings automatically.

**Error display pattern**:
```ts
import { fromZodError } from 'zod-validation-error';

const result = TildeConfigSchema.safeParse(raw);
if (!result.success) {
  const formatted = fromZodError(result.error);
  // "contexts[0].git.email: Invalid email format; contexts[1].label: Required"
  console.error(formatted.message);
}
```

---

## 7. execa vs child_process

**Decision**: `execa` **9.6.1+** (ESM-native, latest stable).

**Rationale**: execa provides: promise-based API with proper error objects, stdout/stderr
as strings without manual buffering, array argument API (prevents shell injection), built-in
timeout support, and signal forwarding. The raw `child_process` API requires manual
promisification, buffer management, error wrapping, and is vulnerable to shell injection when
using string-form commands.

**Usage pattern**:
```ts
import { execa } from 'execa';

// Always use array form — never template strings
await execa('brew', ['install', 'gh']);
const { stdout } = await execa('brew', ['list', '--casks', '-1']);

// With retry
async function withRetry(file: string, args: string[], maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try { return await execa(file, args); }
    catch (e) { if (i === maxRetries - 1) throw e; }
  }
}
```

---

## 8. direnv Hook Integration

**Decision**: Append `eval "$(direnv hook zsh)"` to `.zshrc` if not already present.

**Rationale**: The direnv hook rewrites the shell's `precmd` hook to run `direnv export zsh`
on every prompt — this is what loads/unloads `.envrc` on directory change. Idempotent
insertion: scan `.zshrc` for the string `direnv hook` before appending.

**Pattern**:
```ts
const zshrc = await fs.readFile('~/.zshrc', 'utf8');
if (!zshrc.includes('direnv hook')) {
  await fs.appendFile('~/.zshrc', '\neval "$(direnv hook zsh)"\n');
}
```

The managed `.zshrc` in the dotfiles repo contains this line; tilde's writer generates it
conditionally based on whether direnv was selected.

---

## 9. gh CLI Auth Switching

**Decision**: Use `gh auth switch --user <username>` for per-context account switching.

**Rationale**: `gh` CLI (v2.40+) supports multiple authenticated accounts simultaneously.
`gh auth switch` changes the active account without re-login. The shell `cd` hook (generated
into `.zshrc`) calls this based on `$PWD` pattern matching.

**Generated zshrc snippet**:
```zsh
function cd() {
  builtin cd "$@"
  case "$PWD" in
    *Developer/personal*)  gh auth switch --user personal-account 2>/dev/null ;;
    *Developer/work*)      gh auth switch --user work-account 2>/dev/null ;;
  esac
}
```

---

## 10. Plugin Architecture

**Decision**: TypeScript class instances exported as `export default new MyPlugin()`, implementing
category-specific interfaces that extend a base `TildePlugin` interface.

**Rationale**: Class instances (not plain objects) are preferred because plugins often need
to maintain internal state across method calls (e.g., cached auth tokens, connection handles).
This is the pattern used by oclif (the leading TypeScript CLI framework). Community plugins
follow the `tilde-plugin-*` npm naming convention — same approach as ESLint (`eslint-plugin-*`,
100k+ plugins) and Prettier. Plugin discovery uses 3 layers: static first-party imports,
dynamic `import()` for npm community packages, and local filesystem paths for development.

**Error handling**: Plugins throw `PluginError` (extends `Error`) with a `code` field.
A `PluginExecutor` wrapper catches errors, applies timeouts, and routes to the Ink error UI
with retry/skip/abort recovery options — same pattern as Vite and webpack.

**Alternatives considered**: Plain object exports (ESLint/Vite pattern) are simpler but lose
state-holding capability; external executables (GitHub CLI pattern) add subprocess overhead
and complicate TypeScript type safety. Both deferred to future enhancement consideration.

See `contracts/plugin-api.md` for full interface definitions.
