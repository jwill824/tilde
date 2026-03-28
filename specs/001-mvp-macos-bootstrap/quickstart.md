# Quickstart: tilde Development

## Prerequisites

- Node.js 20+ (`node --version`)
- npm 10+ (`npm --version`)
- macOS Apple Silicon (for running integration tests against real tools)

---

## Setup

```bash
# Clone the repo
git clone https://github.com/[your-username]/tilde.git
cd tilde

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run unit tests
npm test

# Run tilde locally (wizard mode)
node dist/index.js
```

---

## Key Package Versions

| Package | Version | Purpose |
|---------|---------|---------|
| `ink` | 6.8.0 | React-based terminal UI renderer |
| `ink-select-input` | 6.2.0 | Arrow-key selection menus |
| `ink-text-input` | 6.0.0 | Text input fields |
| `ink-spinner` | 5.0.0 | Loading spinners |
| `zod` | 4.3.6+ | Config schema + validation |
| `execa` | 9.6.1+ | Shell command execution (safe) |
| `ignore` | 7.0.5+ | gitignore pattern matching |
| `fast-glob` | 3.3.3+ | File system scanning |
| `ink-testing-library` | 4.0 | Ink component testing |
| `vitest` | 2.x | Test runner (ESM-native) |

---

## Project Layout Quick Reference

```
bootstrap.sh          # The curl | bash entry point
src/
  index.tsx           # Entry: OS detect → mode branch
  app.tsx             # Root Ink App component
  steps/              # One component per wizard step (00- through 13-)
  plugins/            # Plugin system: api.ts, registry.ts, + first-party plugins
  capture/            # Environment scanner and gitignore filter
  config/             # Zod schema + config reader/writer
  state/              # Checkpoint read/write (~/.tilde/state.json)
  utils/              # OS detection, exec wrapper, gitignore helpers
tests/
  unit/               # Pure logic tests (Vitest)
  integration/        # Full install flows in temp dirs
  contract/           # Plugin interface conformance tests
docs/
  config-format.md    # Human-readable config file docs (required by constitution)
```

---

## Running a Wizard Step in Isolation

Each step component accepts `onComplete` and optional `initialValue` props.
You can render any step standalone for development:

```tsx
// dev/preview-step.tsx
import { render } from 'ink';
import { ShellStep } from '../src/steps/02-shell.js';

render(<ShellStep onComplete={(data) => console.log(data)} />);
```

```bash
node --loader ts-node/esm dev/preview-step.tsx
```

---

## Writing a Plugin

1. Create `src/plugins/{name}/index.ts`
2. Implement the appropriate interface from `src/plugins/api.ts`
3. Register in `src/plugins/registry.ts`
4. Add a conformance test in `tests/contract/{category}.contract.ts`

Minimal example (package manager):

```ts
import type { PackageManagerPlugin } from '../api.js';
import { ok, err } from '../api.js';

export const homebrewPlugin: PackageManagerPlugin = {
  id: 'homebrew',
  name: 'Homebrew',
  category: 'package-manager',

  async isAvailable() {
    try { await execa('brew', ['--version']); return true; }
    catch { return false; }
  },

  async install() {
    // install via official Homebrew script
    return ok();
  },

  async isInstalled(pkg) {
    const { exitCode } = await execa('brew', ['list', pkg], { reject: false });
    return exitCode === 0;
  },

  async installPackages(packages) {
    try { await execa('brew', ['install', ...packages]); return ok(); }
    catch (e) { return err(String(e)); }
  },

  async listInstalled() {
    try {
      const { stdout } = await execa('brew', ['list', '-1']);
      return ok(stdout.split('\n').filter(Boolean));
    } catch (e) { return err(String(e)); }
  },
};
```

---

## npm Scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | Compile TypeScript → `dist/` |
| `npm test` | Run all Vitest unit tests |
| `npm run test:integration` | Run integration tests (requires macOS) |
| `npm run test:contract` | Run plugin conformance tests |
| `npm run lint` | ESLint + TypeScript type check |
| `npm run dev` | Run tilde wizard directly via ts-node |

---

## Config File Development

The config schema is defined in `src/config/schema.ts` using Zod.
To test schema validation:

```bash
node -e "
  const { TildeConfigSchema } = require('./dist/config/schema.js');
  const result = TildeConfigSchema.safeParse(require('./my-test-config.json'));
  console.log(result.success ? 'valid' : result.error.issues);
"
```

The human-readable config format docs live at `docs/config-format.md`.
