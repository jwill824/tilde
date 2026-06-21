# Phase 05: Config Discovery Polish - Pattern Map

**Mapped:** 2026-06-20
**Files analyzed:** 7
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/utils/config-discovery.ts` | utility | file-I/O | `src/utils/config-discovery.ts` | exact |
| `src/utils/config-resolution.ts` | utility | request-response | `src/utils/config-discovery.ts` + `src/index.tsx` | role-match |
| `src/index.tsx` | route | request-response | `src/index.tsx` | exact |
| `src/modes/reconfigure.tsx` | component | request-response | `src/modes/reconfigure.tsx` | exact |
| `tests/unit/config-discovery.test.ts` | test | file-I/O | `tests/unit/config-discovery.test.ts` | exact |
| `tests/unit/reconfigure.test.ts` | test | request-response | `tests/unit/reconfigure.test.ts` | exact |
| `tests/integration/cli-regression.test.ts` | test | request-response | `tests/integration/cli-regression.test.ts` | exact |

## Pattern Assignments

### `src/utils/config-discovery.ts` (utility, file-I/O)

**Analog:** `src/utils/config-discovery.ts`

**Imports pattern** (lines 13-16):
```typescript
import { access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { execa } from 'execa';
```

**Bounded git-root detection pattern** (lines 22-35):
```typescript
async function getGitRepoRoot(): Promise<string | null> {
  try {
    const result = await execa('git', ['rev-parse', '--show-toplevel'], {
      timeout: 1000,
      reject: false,
    });
    if (result.exitCode === 0 && result.stdout.trim()) {
      return result.stdout.trim();
    }
    return null;
  } catch {
    return null;
  }
}
```

**Discovery path order pattern** (lines 41-58):
```typescript
export async function getDiscoveryPaths(): Promise<string[]> {
  const home = homedir();
  const cwd = resolve(process.cwd(), 'tilde.config.json');
  const canonicalHome = join(home, '.tilde', 'tilde.config.json');

  const paths: string[] = [cwd];

  const gitRoot = await getGitRepoRoot();
  if (gitRoot) {
    const gitRootConfig = join(gitRoot, 'tilde.config.json');
    // Only add git root path if it differs from cwd
    if (gitRootConfig !== cwd) {
      paths.push(gitRootConfig);
    }
  }

  paths.push(canonicalHome);
  return paths;
}
```

**First-accessible-file wins pattern** (lines 65-75):
```typescript
export async function discoverConfig(): Promise<string | null> {
  for (const p of await getDiscoveryPaths()) {
    try {
      await access(p);
      return p;
    } catch {
      // not found at this path, try next
    }
  }
  return null;
}
```

**Not-found formatter pattern** (lines 80-91):
```typescript
export async function formatNoConfigError(command: string = 'install'): Promise<string> {
  const paths = await getDiscoveryPaths();
  return [
    `Error: tilde requires a config file to run ${command}.`,
    `No config found at any of the standard locations.`,
    ``,
    `Searched:`,
    ...paths.map(p => `  ${p}`),
    ``,
    `Run the wizard to create one: tilde`,
    `Or specify: tilde ${command} --config <path>`,
  ].join('\n');
}
```

**Planning notes:** Extend this file or keep a small adjacent resolver. Add fixed candidates only: `~/.config/tilde/tilde.config.json` and `~/tilde.config.json`. Preserve cwd, git root, and canonical `~/.tilde/tilde.config.json` anchors. Do not add recursive scans.

---

### `src/utils/config-resolution.ts` (utility, request-response)

**Analog:** `src/index.tsx` and `src/utils/config-discovery.ts`

**CLI source parsing pattern to preserve and refine** (lines 37-40, 107-116):
```typescript
function parseCliArgs() {
  // Check env vars first
  const envConfig = process.env.TILDE_CONFIG;
  const envCi = process.env.TILDE_CI === '1' || process.env.TILDE_CI === 'true';

  return {
    configPath: (args.config as string | undefined) ?? envConfig,
    ci: Boolean(args.yes || args.ci || envCi),
    reconfigure: Boolean(args.reconfigure),
    resume: Boolean(args.resume),
    noResume: Boolean(args['no-resume']),
    dryRun: Boolean(args['dry-run']),
    verbose: Boolean(args.verbose),
    positionals,
  };
}
```

**Existing helper boundary to reuse** (lines 65-75):
```typescript
export async function discoverConfig(): Promise<string | null> {
  for (const p of await getDiscoveryPaths()) {
    try {
      await access(p);
      return p;
    } catch {
      // not found at this path, try next
    }
  }
  return null;
}
```

**Explicit-load ownership pattern** (lines 17-31 from `src/config/reader.ts`):
```typescript
export async function loadConfig(
  pathOrUrl: string,
  onMigrated?: (result: MigrationResult) => void,
): Promise<TildeConfig> {
  let content: string;

  if (pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('http://')) {
    const response = await fetch(pathOrUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch config from ${pathOrUrl}: ${response.statusText}`);
    }
    content = await response.text();
  } else {
    const expanded = expandTilde(pathOrUrl);
    content = await readFile(expanded, 'utf-8');
  }
```

**Planning notes:** If created, this helper should return source-aware results such as `flag`, `env`, `positional`, or `discovered`. Missing `--config` and missing `TILDE_CONFIG` must fail without calling auto-discovery. Let `loadConfig()` continue to own reading, JSON parsing, migration, and schema validation for one selected path.

---

### `src/index.tsx` (route, request-response)

**Analog:** `src/index.tsx`

**Imports pattern** (lines 1-15):
```typescript
#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { parseArgs } from 'node:util';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
export { PluginError } from './plugins/api.js';
import { assertMacOS } from './utils/os.js';
import { App } from './app.js';
import { loadConfig } from './config/reader.js';
import { pluginRegistry } from './plugins/registry.js';
import { run } from './utils/exec.js';
import { discoverConfig, formatNoConfigError } from './utils/config-discovery.js';
import type { PluginCategory, AccountConnectorPlugin } from './plugins/api.js';
```

**Current config/context drift to replace** (lines 119-127, 204-214):
```typescript
async function handleContextSubcommand(sub: string, label: string | undefined, configPath: string | undefined) {
  const cwdConfig = resolve(process.cwd(), 'tilde.config.json');
  const cfgPath = configPath || (existsSync(cwdConfig) ? cwdConfig : 'tilde.config.json');
  let config;
  try {
    config = await loadConfig(cfgPath);
  } catch (err) {
    process.stderr.write(`Error loading config: ${(err as Error).message}\n`);
    process.exit(1);
  }
```

```typescript
async function handleConfigSubcommand(sub: string, pathArg: string | undefined, configPath: string | undefined) {
  const cwdConfig = resolve(process.cwd(), 'tilde.config.json');
  const cfgPath = pathArg || configPath || (existsSync(cwdConfig) ? cwdConfig : 'tilde.config.json');

  if (sub === 'validate') {
    try {
      await loadConfig(cfgPath);
      process.stdout.write('✓ Config is valid\n');
    } catch (err) {
      process.stderr.write(`${(err as Error).message}\n`);
      process.exit(2);
    }
```

**Install/update shared discovery pattern** (lines 273-305):
```typescript
if (subcommand === 'update' || subcommand === 'install') {
  // Both 'install' and 'update' require a discoverable config
  const resolvedForCmd = configPath ?? await discoverConfig();

  if (!resolvedForCmd) {
    // T013: config-required error — do NOT launch wizard
    process.stderr.write((await formatNoConfigError(subcommand)) + '\n');
    process.exit(2);
  }

  if (subcommand === 'update') {
    const resource = sub;
    const { UpdateCommand } = await import('./modes/update.js');
    render(React.createElement(UpdateCommand, {
      resource: resource ?? '',
      configPath: resolvedForCmd,
    }));
    return;
  }
```

**Startup config-first versus wizard behavior** (lines 316-334):
```typescript
// Auto-discover tilde.config.json using standard search order (T012)
let resolvedConfigPath = configPath;
if (!resolvedConfigPath) {
  resolvedConfigPath = await discoverConfig() ?? undefined;
}

// Determine mode
let mode: 'wizard' | 'config-first' | 'non-interactive';
if (ci) {
  if (!resolvedConfigPath) {
    process.stderr.write('Error: --ci/--yes requires --config <path>\n');
    process.exit(3);
  }
  mode = 'non-interactive';
} else if (resolvedConfigPath) {
  mode = 'config-first';
} else {
  mode = 'wizard';
}
```

**Planning notes:** Keep plain `tilde` wizard fallback when no config is found. Route `install`, `update`, `config validate/show/edit`, `context list/current/switch`, CI, and `--reconfigure` through shared source-aware resolution. Replace local cwd fallback in config/context handlers.

---

### `src/modes/reconfigure.tsx` (component, request-response)

**Analog:** `src/modes/reconfigure.tsx`

**Imports pattern** (lines 1-9):
```typescript
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { loadConfig } from '../config/reader.js';
import { atomicWriteConfig } from '../config/writer.js';
import { CURRENT_SCHEMA_VERSION } from '../config/migrations/runner.js';
import { Wizard } from './wizard.js';
import type { TildeConfig } from '../config/schema.js';
import type { EnvironmentSnapshot } from '../utils/environment.js';
```

**Phase state pattern** (lines 17-24):
```typescript
type Phase =
  | { type: 'loading' }
  | { type: 'error'; message: string }
  | { type: 'field-errors'; issues: string[]; initialConfig: Partial<TildeConfig> }
  | { type: 'wizard'; initialConfig: Partial<TildeConfig> }
  | { type: 'saving' }
  | { type: 'done' }
  | { type: 'cancelled' };
```

**Missing-config and load-error pattern** (lines 29-54, 76-81):
```typescript
useEffect(() => {
  async function load() {
    if (!configPath) {
      setPhase({
        type: 'error',
        message:
          'No config file found. Run `tilde` (without --reconfigure) to create your initial configuration.',
      });
      return;
    }

    try {
      const config = await loadConfig(configPath);
      setPhase({ type: 'wizard', initialConfig: config });
    } catch (err) {
      const error = err as Error & { code?: string };

      if (error.code === 'ENOENT') {
        setPhase({
          type: 'error',
          message:
            `Config file not found at ${configPath}. ` +
            `Run \`tilde\` (without --reconfigure) to create your initial configuration.`,
        });
        return;
      }
```

```typescript
setPhase({
  type: 'error',
  message:
    `Failed to load config from ${configPath}: ${error.message}. ` +
    `Check file permissions and try again.`,
});
```

**Validation/parse recovery pattern** (lines 56-73):
```typescript
// Validation/parse failure — try to extract partial config
if (error.message?.includes('Config validation failed') || error.message?.includes('parse')) {
  // Attempt partial parse from raw file
  try {
    const { readFile } = await import('node:fs/promises');
    const { TildeConfigSchema } = await import('../config/schema.js');
    const content = await readFile(configPath, 'utf-8');
    const raw = JSON.parse(content) as Record<string, unknown>;
    const partial = TildeConfigSchema.safeParse(raw);
    const initialConfig: Partial<TildeConfig> = partial.success ? partial.data : (raw as Partial<TildeConfig>);
    const issues = partial.success
      ? []
      : partial.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
    setPhase({ type: 'field-errors', issues, initialConfig });
  } catch {
    setPhase({ type: 'wizard', initialConfig: {} });
  }
  return;
}
```

**Error rendering pattern** (lines 97-103):
```typescript
if (phase.type === 'error') {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1}>
      <Text bold color="red">Reconfigure Error</Text>
      <Text>{phase.message}</Text>
    </Box>
  );
}
```

**Planning notes:** Align the `!configPath` case with the shared wizard-first not-found guidance. Keep selected-file-focused validation/parse handling; do not show searched-path alternatives after `loadConfig()` selects and rejects a file.

---

### `tests/unit/config-discovery.test.ts` (test, file-I/O)

**Analog:** `tests/unit/config-discovery.test.ts`

**Imports and external-command mock pattern** (lines 7-19):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'node:path';
import { homedir } from 'node:os';

// Mock execa to control git root detection in unit tests
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

import { execa } from 'execa';
import { getDiscoveryPaths, formatNoConfigError } from '../../src/utils/config-discovery.js';

const mockExeca = vi.mocked(execa);
```

**Path-order test pattern** (lines 26-44):
```typescript
it('first path is ./tilde.config.json in current working directory', async () => {
  mockExeca.mockResolvedValue({ exitCode: 0, stdout: process.cwd() } as never);
  const paths = await getDiscoveryPaths();
  expect(paths[0]).toBe(join(process.cwd(), 'tilde.config.json'));
});

it('includes git repo root when it differs from cwd', async () => {
  const fakeGitRoot = '/fake/git/root';
  mockExeca.mockResolvedValue({ exitCode: 0, stdout: fakeGitRoot } as never);
  const paths = await getDiscoveryPaths();
  expect(paths).toContain(join(fakeGitRoot, 'tilde.config.json'));
  expect(paths.length).toBe(3); // cwd + git root + ~/.tilde/
});
```

**Deduplication and failure pattern** (lines 46-67):
```typescript
it('omits git root path when it equals cwd (no duplication)', async () => {
  mockExeca.mockResolvedValue({ exitCode: 0, stdout: process.cwd() } as never);
  const paths = await getDiscoveryPaths();
  const configPaths = paths.filter(p => p !== join(homedir(), '.tilde', 'tilde.config.json'));
  const cwdPath = join(process.cwd(), 'tilde.config.json');
  expect(configPaths.filter(p => p === cwdPath).length).toBe(1);
  expect(paths.length).toBe(2); // cwd + ~/.tilde/ (no git root duplicate)
});

it('skips git root when execa throws (git unavailable)', async () => {
  mockExeca.mockRejectedValue(new Error('git not found'));
  const paths = await getDiscoveryPaths();
  expect(paths.length).toBe(2);
});
```

**Outdated assertions to invert or replace** (lines 76-86):
```typescript
it('does NOT include old ~/.config/tilde/ path', async () => {
  mockExeca.mockResolvedValue({ exitCode: 0, stdout: process.cwd() } as never);
  const paths = await getDiscoveryPaths();
  expect(paths.every(p => !p.includes('.config/tilde'))).toBe(true);
});

it('does NOT include old ~/tilde.config.json path', async () => {
  mockExeca.mockResolvedValue({ exitCode: 0, stdout: process.cwd() } as never);
  const paths = await getDiscoveryPaths();
  expect(paths.every(p => p !== join(homedir(), 'tilde.config.json'))).toBe(true);
});
```

**Formatter coverage pattern** (lines 113-141):
```typescript
it('includes actionable guidance (run the wizard, specify path)', async () => {
  const msg = await formatNoConfigError('install');
  expect(msg).toContain('tilde');
  expect(msg).toContain('--config');
});

it('lists all discovery paths in the message', async () => {
  const paths = await getDiscoveryPaths();
  const msg = await formatNoConfigError('install');
  for (const p of paths) {
    expect(msg).toContain(p);
  }
});
```

**Planning notes:** Keep `execa` mocked. Add assertions for `~/.config/tilde/tilde.config.json` and `~/tilde.config.json`. Add source-specific missing override formatter tests if resolver/formatter is introduced.

---

### `tests/unit/reconfigure.test.ts` (test, request-response)

**Analog:** `tests/unit/reconfigure.test.ts`

**Imports and fixture pattern** (lines 14-17, 22-48):
```typescript
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';

const VALID_CONFIG = {
  $schema: 'https://thingstead.io/tilde/config-schema/v1.json',
  schemaVersion: '1.5',
  os: 'macos',
  shell: 'zsh',
  packageManagers: ['homebrew'],
  versionManagers: [],
  languages: [],
  workspaceRoot: '~/Developer',
  dotfilesRepo: '~/Developer/personal/dotfiles',
  contexts: [
```

**Wizard mock pattern** (lines 54-68):
```typescript
function makeWizardMock(onMounted?: (props: { initialConfig: Record<string, unknown>; onComplete: (cfg: Record<string, unknown>) => void }) => void) {
  return vi.fn((props: {
    initialConfig: Record<string, unknown>;
    onComplete: (cfg: Record<string, unknown>) => void;
    onExit: () => void;
  }) => {
    React.useEffect(() => {
      if (onMounted) {
        onMounted(props);
      } else {
        props.onComplete({ ...props.initialConfig, _testCompleted: true });
      }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
  });
}
```

**Module mocking and render pattern** (lines 80-99):
```typescript
it('renders wizard with pre-populated defaults from existing config', async () => {
  const mockAtomicWriteConfig = vi.fn().mockResolvedValue(undefined);
  const mockLoadConfig = vi.fn().mockResolvedValue(VALID_CONFIG);
  const WizardMock = makeWizardMock();

  vi.doMock('../../src/config/writer.js', () => ({ atomicWriteConfig: mockAtomicWriteConfig }));
  vi.doMock('../../src/config/reader.js', () => ({ loadConfig: mockLoadConfig }));
  vi.doMock('../../src/config/migrations/runner.js', () => ({ CURRENT_SCHEMA_VERSION: '1.5' }));
  vi.doMock('../../src/modes/wizard.js', () => ({ Wizard: WizardMock }));

  const { ReconfigureMode } = await import('../../src/modes/reconfigure.js');
  render(
    React.createElement(ReconfigureMode, {
      configPath: CONFIG_PATH,
      environment: {} as never,
      onComplete: vi.fn(),
    })
  );

  await new Promise(resolve => setTimeout(resolve, 200));
```

**ENOENT no-wizard assertion pattern** (lines 139-165):
```typescript
it('shows actionable error when config file does not exist (ENOENT) — wizard NOT launched', async () => {
  const mockAtomicWriteConfig = vi.fn().mockResolvedValue(undefined);
  const notFoundError = Object.assign(new Error('not found'), { code: 'ENOENT' });
  const mockLoadConfig = vi.fn().mockRejectedValue(notFoundError);
  const WizardMock = makeWizardMock();

  vi.doMock('../../src/config/writer.js', () => ({ atomicWriteConfig: mockAtomicWriteConfig }));
  vi.doMock('../../src/config/reader.js', () => ({ loadConfig: mockLoadConfig }));
  vi.doMock('../../src/config/migrations/runner.js', () => ({ CURRENT_SCHEMA_VERSION: '1.5' }));
  vi.doMock('../../src/modes/wizard.js', () => ({ Wizard: WizardMock }));

  const { ReconfigureMode } = await import('../../src/modes/reconfigure.js');
  const { lastFrame } = render(
    React.createElement(ReconfigureMode, {
      configPath: '/nonexistent/tilde.config.json',
      environment: {} as never,
      onComplete: vi.fn(),
    })
  );

  await new Promise(resolve => setTimeout(resolve, 200));

  const frame = lastFrame() ?? '';
  expect(frame).toContain('not found');
  expect(WizardMock).not.toHaveBeenCalled();
  expect(mockAtomicWriteConfig).not.toHaveBeenCalled();
});
```

**Planning notes:** Add tests for shared not-found guidance in `--reconfigure` when no auto-discovered config exists. Keep validation-error behavior distinct from no-config behavior.

---

### `tests/integration/cli-regression.test.ts` (test, request-response)

**Analog:** `tests/integration/cli-regression.test.ts`

**Built CLI invocation pattern** (lines 1-6):
```typescript
import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import { resolve } from 'node:path';

const BIN = resolve(import.meta.dirname, '../..', 'dist/bin/tilde.js');
```

**Regression test structure** (lines 7-18):
```typescript
describe('CLI regression — #45', () => {
  it('produces non-empty stdout on --version', async () => {
    const result = await execa('node', [BIN, '--version'], { reject: false, timeout: 10_000 });
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(result.exitCode).toBe(0);
  });

  it('produces non-empty stdout on --help', async () => {
    const result = await execa('node', [BIN, '--help'], { reject: false, timeout: 10_000 });
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(result.exitCode).toBe(0);
  });
```

**Planning notes:** Extend this file for command-level behavior after `npm run build`. Use temp working directories and controlled `env` values. Cover `install`, `update`, `config validate/show/edit`, `context list/current/switch`, startup config-first, `--reconfigure`, missing `--config`, missing `TILDE_CONFIG`, and invalid explicit config. Do not invoke real external tools where avoidable; use commands that stop at config resolution or point to safe temp files.

## Shared Patterns

### NodeNext ESM Imports

**Source:** `src/index.tsx`, `src/modes/reconfigure.tsx`, `src/utils/config-discovery.ts`
**Apply to:** All source files
```typescript
import { loadConfig } from './config/reader.js';
import { discoverConfig, formatNoConfigError } from './utils/config-discovery.js';
import type { PluginCategory, AccountConnectorPlugin } from './plugins/api.js';
```

Use relative imports with `.js` extensions in TypeScript source.

### Selected-File Loading And Validation

**Source:** `src/config/reader.ts` lines 34-39, 69-75
**Apply to:** Config resolution callers, reconfigure, config/context subcommands
```typescript
let raw: unknown;
try {
  raw = JSON.parse(content);
} catch (e) {
  throw new Error(`Failed to parse config as JSON: ${(e as Error).message}`, { cause: e });
}

const result = TildeConfigSchema.safeParse(migrationResult.config);
if (!result.success) {
  const validationError = fromZodError(result.error);
  throw new Error(`Config validation failed:\n${validationError.message}`);
}

return result.data;
```

### CLI Error And Exit Handling

**Source:** `src/index.tsx` lines 124-127, 278-281, 326-327
**Apply to:** All config-required subcommands
```typescript
try {
  config = await loadConfig(cfgPath);
} catch (err) {
  process.stderr.write(`Error loading config: ${(err as Error).message}\n`);
  process.exit(1);
}

if (!resolvedForCmd) {
  process.stderr.write((await formatNoConfigError(subcommand)) + '\n');
  process.exit(2);
}

if (!resolvedConfigPath) {
  process.stderr.write('Error: --ci/--yes requires --config <path>\n');
  process.exit(3);
}
```

Keep deterministic stdout/stderr and explicit exit codes.

### Ink Error State

**Source:** `src/modes/reconfigure.tsx` lines 97-103
**Apply to:** Reconfigure UI error rendering
```typescript
if (phase.type === 'error') {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1}>
      <Text bold color="red">Reconfigure Error</Text>
      <Text>{phase.message}</Text>
    </Box>
  );
}
```

### External Command Test Mocking

**Source:** `tests/unit/config-discovery.test.ts` lines 11-19
**Apply to:** Unit tests around git-root discovery
```typescript
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

import { execa } from 'execa';
const mockExeca = vi.mocked(execa);
```

### CLI Regression Execution

**Source:** `tests/integration/cli-regression.test.ts` lines 5, 9, 15
**Apply to:** Built CLI integration cases
```typescript
const BIN = resolve(import.meta.dirname, '../..', 'dist/bin/tilde.js');

const result = await execa('node', [BIN, '--version'], { reject: false, timeout: 10_000 });
```

## No Analog Found

No files in the Phase 5 scope lack a close codebase analog. The optional `src/utils/config-resolution.ts` file should copy utility and CLI resolution patterns from `src/utils/config-discovery.ts` and `src/index.tsx`.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| none | n/a | n/a | All planned files have exact or role-match analogs. |

## Metadata

**Analog search scope:** `src/utils/`, `src/config/`, `src/modes/`, `src/steps/`, `tests/unit/`, `tests/integration/`
**Files scanned:** 13 source/test hits from `rg` plus 7 full analog reads
**Pattern extraction date:** 2026-06-20
