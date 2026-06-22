# Phase 07: Config and Schema Versioning Foundation - Pattern Map

**Mapped:** 2026-06-21
**Files analyzed:** 23
**Analogs found:** 23 / 23

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.planning/REQUIREMENTS.md` | config | transform | `.planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md` | exact |
| `.planning/ROADMAP.md` | config | transform | `.planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md` | exact |
| `src/config/schema-version.ts` | utility | transform | `src/config/migrations/runner.ts` | role-match |
| `src/config/schema.ts` | model | transform | `src/config/schema.ts` | exact |
| `src/config/schema-metadata.ts` | model | transform | `src/config/schema.ts` | role-match |
| `src/config/schema-viewer.ts` | utility | transform | `src/index.tsx` | partial |
| `src/config/migrations/runner.ts` | service | transform | `src/config/migrations/runner.ts` | exact |
| `src/config/reader.ts` | service | file-I/O | `src/config/reader.ts` | exact |
| `src/config/writer.ts` | service | file-I/O | `src/config/writer.ts` | exact |
| `src/modes/config-first.tsx` | component | file-I/O | `src/modes/config-first.tsx` | exact |
| `src/modes/reconfigure.tsx` | component | file-I/O | `src/modes/reconfigure.tsx` | exact |
| `src/modes/update.tsx` | component | file-I/O | `src/modes/update.tsx` | exact |
| `src/index.tsx` | controller | request-response | `src/index.tsx` | exact |
| `scripts/generate-schema-metadata.ts` | utility | file-I/O | `scripts/validate-config-doc-example.ts` | role-match |
| `site/docs/src/data/tilde-config-schema.json` | config | file-I/O | `scripts/validate-config-doc-example.ts` | partial |
| `site/docs/src/components/SchemaExplorer.astro` | component | event-driven | `site/docs/src/content/docs/index.mdx` | partial |
| `site/docs/src/content/docs/config-schema.mdx` | component | request-response | `site/docs/src/content/docs/index.mdx` | role-match |
| `site/docs/astro.config.mjs` | config | request-response | `site/docs/astro.config.mjs` | exact |
| `tests/unit/config/schema-version.test.ts` | test | transform | `tests/unit/config/migration-runner.test.ts` | role-match |
| `tests/unit/config/schema-v2.test.ts` | test | transform | `tests/unit/config/schema-v2.test.ts` | exact |
| `tests/unit/config/migration-runner.test.ts` | test | transform | `tests/unit/config/migration-runner.test.ts` | exact |
| `tests/contract/config-schema.test.ts` | test | file-I/O | `tests/contract/config-schema.test.ts` | exact |
| `tests/integration/cli-regression.test.ts` | test | request-response | `tests/integration/cli-regression.test.ts` | exact |

## Pattern Assignments

### `.planning/REQUIREMENTS.md` and `.planning/ROADMAP.md` (config, transform)

**Analog:** `.planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md`

**Scope update pattern** (lines 36-38):
```markdown
- **D-13:** Remove `repos.json` from Phase 07 scope. GitHub issue #81 does not resolve in this repository, and the user identified it as likely stray scope related to `github-repo-factory`.
- **D-14:** Phase 07 should update roadmap/requirements before planning or execution so the widened website explorer scope is explicit and the `repos.json` requirement is removed.
```

**Apply to:** remove or rewrite `repos.json` Phase 07 requirements, add CLI schema viewer and docs-site schema explorer scope before implementation planning.

---

### `src/config/schema-version.ts` (utility, transform)

**Analog:** `src/config/migrations/runner.ts`

**Imports pattern:** no imports needed for pure version parsing. Keep this module dependency-free and export named helpers.

**Current comparison anti-pattern to replace** (lines 73-90):
```typescript
const fromFloat = parseFloat(fromVersionStr);
const targetFloat = parseFloat(targetVersion);

if (fromFloat > targetFloat) {
  return {
    config: raw,
    migratedFrom: fromVersionStr,
    migratedTo: targetVersion,
    didMigrate: false,
    isFutureVersion: true,
  };
}

const applicableKeys = Array.from(MIGRATIONS.keys())
  .map(k => ({ key: k, float: parseFloat(k) }))
  .filter(({ float }) => float >= fromFloat && float < targetFloat)
  .sort((a, b) => a.float - b.float);
```

**Core pattern to preserve:** expose small named pure functions used by migration, schema validation, and tests. Replace float ordering with tuple comparison for `major.minor`.

**Validation behavior:** reject missing, numeric, malformed, and patch-bearing values per CONTEXT D-02, D-03, and D-08.

---

### `src/config/schema.ts` (model, transform)

**Analog:** `src/config/schema.ts`

**Imports pattern** (line 1):
```typescript
import { z } from 'zod';
```

**Current schemaVersion pattern to change** (lines 79-85):
```typescript
const TildeConfigSchema = z.object({
  $schema: z.string().default('https://thingstead.io/tilde/config-schema/v1.json'),
  version: z.literal('1').default('1'),
  schemaVersion: z.union([z.string(), z.number()])
    .transform(v => String(v))
    .default('1.6'),
  os: z.literal('macos').default('macos'),
```

**Validation/refinement pattern** (lines 108-134):
```typescript
}).superRefine((config, ctx) => {
  const labels = config.contexts.map(c => c.label);
  const seen = new Set<string>();
  labels.forEach((label, idx) => {
    if (seen.has(label)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate context label: "${label}"`,
        path: ['contexts', idx, 'label'],
      });
    }
    seen.add(label);
  });
});
```

**Exports pattern** (lines 136-145):
```typescript
export { TildeConfigSchema, DeveloperContextSchema, BrowserConfigSchema, EditorsConfigSchema, AIToolConfigSchema, LanguageBindingSchema };
export type TildeConfig = z.infer<typeof TildeConfigSchema>;
```

**Apply to:** make `schemaVersion` a required `major.minor` string, keep top-level `version` only as deprecated/defaulted legacy metadata, and keep exported types colocated with schemas.

---

### `src/config/schema-metadata.ts` (model, transform)

**Analog:** `src/config/schema.ts`

**Model structure pattern** (lines 5-40):
```typescript
const EnvVarReferenceSchema = z.object({
  key: z.string().min(1),
  value: z.string().refine(
    (v) => !SECRET_PATTERN.test(v),
    { message: 'envVar value must be a backend reference, not a resolved secret' }
  ),
});

const DeveloperContextSchema = z.object({
  label: z.string().min(1),
  path: z.string().min(1),
  git: GitIdentitySchema,
  github: GitHubAccountSchema.optional(),
  authMethod: z.enum(['gh-cli', 'https', 'ssh']),
  envVars: z.array(EnvVarReferenceSchema).optional().default([]),
  vscodeProfile: z.string().optional(),
  isDefault: z.boolean().optional(),
  languageBindings: z.array(LanguageBindingSchema).optional().default([]),
  dotfilesPath: z.string().optional(),
});
```

**Core pattern:** define explicit nested field descriptors as named exports, mirroring the existing Zod schema shape. Include `path`, `type`, `required`, `defaultValue`, `since`, `deprecated`, `description`, and `children`.

**Do not copy:** Zod transforms. Research found raw `z.toJSONSchema(TildeConfigSchema)` is not enough because current schema uses transforms and defaults differently from user-facing docs.

---

### `src/config/schema-viewer.ts` (utility, transform)

**Analog:** `src/index.tsx`

**Deterministic stdout formatting pattern** (lines 211-225):
```typescript
if (sub === 'list') {
  for (const ctx of config.contexts) {
    process.stdout.write(`${ctx.label}  ${ctx.path}  ${ctx.git.email}\n`);
  }
  process.exit(0);
}

if (sub === 'current') {
  const cwd = process.cwd();
  const match = config.contexts.find(ctx => {
    const expanded = ctx.path.startsWith('~/') ? ctx.path.replace(/^~\//, process.env.HOME + '/') : ctx.path;
    return cwd.startsWith(expanded);
  });
  process.stdout.write(match ? `${match.label}\n` : 'none\n');
  process.exit(0);
}
```

**Core pattern:** make formatter functions pure and return strings; let `src/index.tsx` own `process.stdout.write()` and `process.exit()`.

---

### `src/config/migrations/runner.ts` (service, transform)

**Analog:** `src/config/migrations/runner.ts`

**Types and registry pattern** (lines 15-33):
```typescript
export type MigrationStep = (config: Record<string, unknown>) => Record<string, unknown>;

export interface MigrationResult {
  config: Record<string, unknown>;
  migratedFrom: string;
  migratedTo: string;
  didMigrate: boolean;
  isFutureVersion: boolean;
}

export const CURRENT_SCHEMA_VERSION = '1.6';

export const MIGRATIONS: Map<string, MigrationStep> = new Map([
  // v1.5 → v1.6: packageManager (string) → packageManagers (array)
```

**Migration implementation pattern** (lines 34-43):
```typescript
['1.5', (config) => {
  const pm = config['packageManager'];
  if (typeof pm === 'string' && !Array.isArray(config['packageManagers'])) {
    const rest = Object.fromEntries(
      Object.entries(config).filter(([k]) => k !== 'packageManager')
    );
    return { ...rest, packageManagers: [pm] };
  }
  return config;
}],
```

**Core runner pattern** (lines 92-110):
```typescript
let current: Record<string, unknown> = { ...raw };

for (const { key } of applicableKeys) {
  const step = MIGRATIONS.get(key);
  if (step) {
    current = step(current);
  }
}

current = { ...current, schemaVersion: targetVersion };

return {
  config: current,
  migratedFrom: fromVersionStr,
  migratedTo: targetVersion,
  didMigrate: true,
  isFutureVersion: false,
};
```

**Required change:** stop defaulting missing `schemaVersion` to `'1'`; missing or numeric versions are invalid in this phase. Use `src/config/schema-version.ts` for all ordering and future-version checks.

---

### `src/config/reader.ts` (service, file-I/O)

**Analog:** `src/config/reader.ts`

**Imports pattern** (lines 1-8):
```typescript
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fromZodError } from 'zod-validation-error';
import { TildeConfigSchema, type TildeConfig } from './schema.js';
import { runMigrations, CURRENT_SCHEMA_VERSION, type MigrationResult } from './migrations/runner.js';
import './migrations/v1-5.js';
import { atomicWriteConfig } from './writer.js';
```

**JSON parse and migration error pattern** (lines 34-51):
```typescript
let raw: unknown;
try {
  raw = JSON.parse(content);
} catch (e) {
  throw new Error(`Failed to parse config as JSON: ${(e as Error).message}`, { cause: e });
}

const rawRecord = (typeof raw === 'object' && raw !== null) ? raw as Record<string, unknown> : {};
let migrationResult: MigrationResult;
try {
  migrationResult = runMigrations(rawRecord, CURRENT_SCHEMA_VERSION);
} catch (err) {
  throw new Error(
    `Config migration failed: ${(err as Error).message}. The original config file has not been modified.`,
    { cause: err }
  );
}
```

**Future-version warning pattern** (lines 53-58):
```typescript
console.warn(
  `[tilde] Warning: config schemaVersion (${rawRecord['schemaVersion']}) is newer than ` +
  `this version of tilde (CURRENT_SCHEMA_VERSION=${CURRENT_SCHEMA_VERSION}). ` +
  `Proceeding in read-only mode — config will not be rewritten.`
);
```

**Atomic rewrite-on-load pattern** (lines 61-67):
```typescript
if (migrationResult.didMigrate && !pathOrUrl.startsWith('http')) {
  const { join: pathJoin } = await import('node:path');
  const expandedPath = pathOrUrl.startsWith('~/') ? pathJoin(homedir(), pathOrUrl.slice(2)) : pathOrUrl;
  const migratedContent = JSON.stringify(migrationResult.config, null, 2) + '\n';
  await atomicWriteConfig(expandedPath, migratedContent);
  onMigrated?.(migrationResult);
}
```

**Validation error pattern** (lines 69-75):
```typescript
const result = TildeConfigSchema.safeParse(migrationResult.config);
if (!result.success) {
  const validationError = fromZodError(result.error);
  throw new Error(`Config validation failed:\n${validationError.message}`);
}

return result.data;
```

**Apply to:** add unknown-field warning detection before Zod strips unsupported keys, preserve atomic rewrite for successful supported migrations, and expose future-version state clearly enough for mutation paths to soft-block.

---

### `src/config/writer.ts` (service, file-I/O)

**Analog:** `src/config/writer.ts`

**Imports pattern** (lines 1-5):
```typescript
import { writeFile, rename, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { TildeConfig } from './schema.js';
import { CURRENT_SCHEMA_VERSION } from './migrations/runner.js';
```

**Secret guard pattern** (lines 16-25):
```typescript
function containsSecret(config: TildeConfig): boolean {
  for (const context of config.contexts) {
    for (const envVar of context.envVars ?? []) {
      if (SECRET_PATTERN.test(envVar.value)) {
        return true;
      }
    }
  }
  return false;
}
```

**Atomic write pattern** (lines 27-36):
```typescript
export async function atomicWriteConfig(targetPath: string, content: string): Promise<void> {
  const tmpPath = `${targetPath}.tmp`;
  await writeFile(tmpPath, content, 'utf-8');
  try {
    await rename(tmpPath, targetPath);
  } catch (err) {
    try { await unlink(tmpPath); } catch { /* ignore cleanup failure */ }
    throw err;
  }
}
```

**Version stamping pattern** (lines 49-69):
```typescript
const home = homedir();
const canonicalDir = join(home, '.tilde');
const configWithVersion = { ...config, schemaVersion: CURRENT_SCHEMA_VERSION };
const content = JSON.stringify(configWithVersion, null, 2) + '\n';

await mkdir(canonicalDir, { recursive: true });
const canonicalPath = join(canonicalDir, 'tilde.config.json');

if (!dotfilesRepo) {
  await atomicWriteConfig(canonicalPath, content);
  return canonicalPath;
}
```

**Apply to:** keep every write stamped with `CURRENT_SCHEMA_VERSION`; do not write configs when caller has identified an unsupported future schema.

---

### `src/modes/config-first.tsx` (component, file-I/O)

**Analog:** `src/modes/config-first.tsx`

**Imports pattern** (lines 1-15):
```typescript
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { fromZodError } from 'zod-validation-error';
import { TildeConfigSchema, type TildeConfig } from '../config/schema.js';
import { runMigrations, CURRENT_SCHEMA_VERSION } from '../config/migrations/runner.js';
import { atomicWriteConfig } from '../config/writer.js';
```

**Migration rewrite pattern** (lines 80-95):
```typescript
const expanded = expandTilde(configPath);
const content = await readFile(expanded, 'utf-8');
const raw = JSON.parse(content) as Record<string, unknown>;
const migrationResult = runMigrations(raw, CURRENT_SCHEMA_VERSION);
if (migrationResult.didMigrate) {
  const migrated = JSON.stringify({ ...migrationResult.config, schemaVersion: CURRENT_SCHEMA_VERSION }, null, 2) + '\n';
  try {
    await atomicWriteConfig(expanded, migrated);
  } catch {
    // Non-fatal: continue even if migration write fails
  }
}
setPhase(validateAndTransition(migrationResult.config as Record<string, unknown>));
```

**Apply to:** add future-version detection before the confirm/apply phase; configs with unsupported future schema may be inspected but must not install, write dotfiles, or rewrite.

---

### `src/modes/reconfigure.tsx` (component, file-I/O)

**Analog:** `src/modes/reconfigure.tsx`

**Recovery pattern** (lines 37-43):
```typescript
function recoverValidConfigFields(raw: Record<string, unknown>): Partial<TildeConfig> {
  const recovered: Partial<TildeConfig> = {};

  if (raw.$schema === undefined || typeof raw.$schema === 'string') recovered.$schema = raw.$schema;
  if (raw.version === undefined || raw.version === '1') recovered.version = raw.version;
  if (typeof raw.schemaVersion === 'string' || typeof raw.schemaVersion === 'number') recovered.schemaVersion = String(raw.schemaVersion);
```

**Save pattern** (lines 99-103):
```typescript
async function saveConfig(configPath: string, newConfig: TildeConfig) {
  const parsed = TildeConfigSchema.parse({ ...newConfig, schemaVersion: CURRENT_SCHEMA_VERSION });
  const content = JSON.stringify(parsed, null, 2) + '\n';
  await atomicWriteConfig(configPath, content);
}
```

**Load pattern** (lines 121-124):
```typescript
try {
  const config = await loadConfig(configPath);
  setPhase({ type: 'wizard', initialConfig: config });
} catch (err) {
```

**Apply to:** stop recovering numeric `schemaVersion` as valid for the new contract, and prevent reconfigure save for unsupported future schemas.

---

### `src/modes/update.tsx` (component, file-I/O)

**Analog:** `src/modes/update.tsx`

**Resource validation pattern** (lines 33-63):
```typescript
export const VALID_UPDATE_RESOURCES = [
  'shell',
  'editor',
  'applications',
  'browser',
  'ai-tools',
  'contexts',
  'languages',
] as const;

export type UpdateResource = typeof VALID_UPDATE_RESOURCES[number];

export function isValidUpdateResource(resource: string): resource is UpdateResource {
  return VALID_UPDATE_RESOURCES.includes(resource as UpdateResource);
}

export function formatInvalidResourceError(resource: string): string {
  return [
    `Error: "${resource}" is not a valid update resource.`,
    ``,
    `Valid resources:`,
    `  ${VALID_UPDATE_RESOURCES.join(', ')}`,
    ``,
    `Usage: tilde update <resource>`,
  ].join('\n');
}
```

**Load and write pattern** (lines 94-110):
```typescript
setPhase({ type: 'loading' });
loadConfig(configPath)
  .then(config => setPhase({ type: 'updating', config }))
  .catch(err => {
    const msg = (err as Error).message;
    setPhase({ type: 'error', exitCode: 3, message: `Config error: ${msg}` });
  });

async function writeUpdated(config: TildeConfig, updated: Partial<TildeConfig>) {
  setPhase({ type: 'writing' });
  try {
    const merged = { ...config, ...updated, schemaVersion: CURRENT_SCHEMA_VERSION };
    const content = JSON.stringify(merged, null, 2) + '\n';
    await atomicWriteConfig(configPath, content);
```

**Apply to:** wire future-schema soft-block into update before entering resource update UI or writing merged config.

---

### `src/index.tsx` (controller, request-response)

**Analog:** `src/index.tsx`

**CLI parser option pattern** (lines 126-141):
```typescript
const parsed = parseArgs({
  args: process.argv.slice(2),
  options: {
    config: { type: 'string', short: 'c' },
    yes: { type: 'boolean', short: 'y' },
    ci: { type: 'boolean' },
    reconfigure: { type: 'boolean' },
    resume: { type: 'boolean' },
    'no-resume': { type: 'boolean' },
    'dry-run': { type: 'boolean' },
    verbose: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
  },
```

**Help output pattern** (lines 150-180):
```typescript
if (args.help) {
  process.stdout.write(`
tilde — developer environment bootstrap

Usage: tilde [install] [options]
       tilde update <resource> [--config <path>]
       tilde context <list|current|switch> [label]
       tilde plugin <list|add|remove> [name]
       tilde config <validate|show|edit> [path]
`);
  process.exit(0);
}
```

**Config subcommand routing pattern** (lines 297-331):
```typescript
async function handleConfigSubcommand(
  sub: string,
  pathArg: string | undefined,
  configInputs: ConfigPathInputs
) {
  const context = configCommandContext(sub);
  const resolved = await resolveRequiredConfigPath({
    ...configInputs,
    positionalConfigPath: pathArg,
    context,
    exitCode: 2,
  });

  if (sub === 'validate') {
    await loadResolvedConfig(resolved, context, 2);
    process.stdout.write('✓ Config is valid\n');
    process.exit(0);
  }
```

**Subcommand dispatch pattern** (lines 359-374):
```typescript
const [subcommand, sub, arg] = positionals;

if (subcommand === 'config') {
  await handleConfigSubcommand(sub ?? 'show', arg, configInputs);
  return;
}
```

**Apply to:** add `tilde config schema` as a fast path before `resolveRequiredConfigPath()` because schema inspection does not require a user config. Add `--json` parsing support and update help text to include `schema`.

---

### `scripts/generate-schema-metadata.ts` and `site/docs/src/data/tilde-config-schema.json` (utility/config, file-I/O)

**Analog:** `scripts/validate-config-doc-example.ts`

**Node ESM imports and path resolution pattern** (lines 13-21):
```typescript
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TildeConfigSchema } from '../src/config/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const docPath = resolve(__dirname, '../docs/config-format.md');
```

**Deterministic error/exit pattern** (lines 23-35):
```typescript
let raw: string;
try {
  raw = readFileSync(docPath, 'utf8');
} catch (err) {
  console.error(`❌ Could not read docs/config-format.md: ${(err as Error).message}`);
  process.exit(1);
}

const fenceMatch = raw.match(/```json\n([\s\S]*?)```/);
if (!fenceMatch) {
  console.error('❌ No fenced JSON code block found in docs/config-format.md');
  process.exit(1);
}
```

**Validation/reporting pattern** (lines 92-101):
```typescript
const result = TildeConfigSchema.safeParse(parsed);
if (result.success) {
  console.log('✅ Config doc example is valid');
  process.exit(0);
} else {
  console.error('❌ Config doc example failed Zod validation:');
  for (const issue of result.error.issues) {
    console.error(`  - [${issue.path.join('.')}] ${issue.message}`);
  }
  process.exit(1);
}
```

**Apply to:** import `tildeConfigSchemaMetadata` from `src/config/schema-metadata.js`, write stable pretty JSON to `site/docs/src/data/tilde-config-schema.json`, and exit nonzero on write/import failures.

---

### `site/docs/src/components/SchemaExplorer.astro` and `site/docs/src/content/docs/config-schema.mdx` (component, event-driven/request-response)

**Analog:** `site/docs/src/content/docs/index.mdx`

**Frontmatter and Starlight import pattern** (lines 1-18):
```mdx
---
title: Welcome to tilde
description: tilde configures your macOS developer environment from a single config file.
template: splash
---

import { Card, CardGrid } from '@astrojs/starlight/components';
```

**Component usage pattern** (lines 21-38):
```mdx
<CardGrid stagger>
  <Card title="Configuration-First" icon="setting">
    Define your entire dev environment in a single `tilde.config.json`. Every tool,
    language, and preference is version-controlled and reproducible.
  </Card>
</CardGrid>
```

**Apply to:** create an MDX docs page that imports the Astro component and generated JSON. Keep the explorer as docs UI only: searchable tree, expand/collapse, field details; no config validator/playground.

---

### `site/docs/astro.config.mjs` (config, request-response)

**Analog:** `site/docs/astro.config.mjs`

**Starlight integration/sidebar pattern** (lines 1-27):
```javascript
// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	site: 'https://tilde.thingstead.io',
	base: '/docs/',
	integrations: [
		starlight({
			title: 'tilde',
			description: 'tilde configures your macOS developer environment from a single config file',
			sidebar: [
				{ label: 'Installation', slug: 'installation' },
				{ label: 'Getting Started', slug: 'getting-started' },
				{ label: 'Configuration Reference', slug: 'config-reference' },
				{ label: 'Configuration Format', slug: 'config-format' },
			],
			customCss: ['./src/styles/tilde-theme.css'],
		}),
	],
});
```

**Apply to:** add `{ label: 'Configuration Schema', slug: 'config-schema' }` in the configuration docs area. Preserve tabs/indent style already used in this file.

---

### `tests/unit/config/schema-version.test.ts` (test, transform)

**Analog:** `tests/unit/config/migration-runner.test.ts`

**Vitest import and describe pattern** (lines 1-7):
```typescript
import { describe, it, expect } from 'vitest';
import { runMigrations, CURRENT_SCHEMA_VERSION, type MigrationStep } from '../../../src/config/migrations/runner.js';

describe('runMigrations()', () => {
```

**Future-version test pattern** (lines 44-50):
```typescript
it('schemaVersion higher than target → isFutureVersion: true, didMigrate: false (FR-018)', () => {
  const raw = { schemaVersion: '99', field: 'x' };
  const result = runMigrations(raw, '1.5');
  expect(result.isFutureVersion).toBe(true);
  expect(result.didMigrate).toBe(false);
  expect(result.config).toEqual(raw);
});
```

**Apply to:** add tests for `1.10 > 1.9`, `2.0 > 1.99`, malformed values, missing values, numeric values, and patch values like `1.6.1`.

---

### `tests/unit/config/schema-v2.test.ts` (test, transform)

**Analog:** `tests/unit/config/schema-v2.test.ts`

**Current behavior tests to update** (lines 34-57):
```typescript
describe('schemaVersion field — round-trip', () => {
  it('valid config with schemaVersion: "1.6" passes Zod validation', () => {
    const result = TildeConfigSchema.safeParse({ ...MINIMAL_CONFIG, schemaVersion: '1.6' });
    expect(result.success).toBe(true);
  });

  it('valid config with schemaVersion: 1 (integer) is coerced to string "1"', () => {
    const result = TildeConfigSchema.safeParse({ ...MINIMAL_CONFIG, schemaVersion: 1 });
    expect(result.success).toBe(true);
  });

  it('config without schemaVersion field defaults to "1.6"', () => {
    const result = TildeConfigSchema.safeParse(MINIMAL_CONFIG);
    expect(result.success).toBe(true);
  });
});
```

**Apply to:** invert the numeric and missing cases so they fail. Keep valid `major.minor` strings passing.

---

### `tests/unit/config/migration-runner.test.ts` (test, transform)

**Analog:** `tests/unit/config/migration-runner.test.ts`

**Same-version pattern** (lines 8-16):
```typescript
it('same-version input → MigrationResult with didMigrate: false', () => {
  const raw = { schemaVersion: '1.5', name: 'test' };
  const result = runMigrations(raw, '1.5');
  expect(result.didMigrate).toBe(false);
  expect(result.isFutureVersion).toBe(false);
  expect(result.migratedFrom).toBe('1.5');
  expect(result.migratedTo).toBe('1.5');
  expect(result.config).toEqual(raw);
});
```

**Existing migration pattern** (lines 75-92):
```typescript
it('migrates v1.5 config: packageManager string → packageManagers array', () => {
  const raw = { schemaVersion: '1.5', packageManager: 'homebrew', name: 'test' };
  const result = runMigrations(raw, '1.6');
  expect(result.didMigrate).toBe(true);
  expect(result.migratedFrom).toBe('1.5');
  expect(result.migratedTo).toBe('1.6');
  expect(result.config['packageManagers']).toEqual(['homebrew']);
  expect(result.config['packageManager']).toBeUndefined();
});
```

**Apply to:** keep same-version, future-version, and migration tests; update missing/numeric version tests to expect errors; add semver ordering regression for `1.10`.

---

### `tests/contract/config-schema.test.ts` (test, file-I/O)

**Analog:** `tests/contract/config-schema.test.ts`

**Fixture pattern** (lines 20-53):
```typescript
const MINIMAL_CONFIG: TildeConfig = {
  $schema: 'https://thingstead.io/tilde/config-schema/v1.json',
  version: '1',
  schemaVersion: '1.5',
  os: 'macos',
  shell: 'zsh',
  packageManagers: ['homebrew'],
  versionManagers: [],
  languages: [],
  workspaceRoot: '~/Developer',
  dotfilesRepo: '~/Developer/personal/dotfiles',
  contexts: [
    {
      label: 'personal',
      path: '~/Developer/personal',
      git: { name: 'Test User', email: 'test@example.com' },
      authMethod: 'gh-cli',
      envVars: [],
      languageBindings: [],
    },
  ],
  tools: [],
  configurations: {
    git: true,
    vscode: false,
    aliases: false,
    osDefaults: false,
    direnv: false,
  },
  accounts: [],
  secretsBackend: '1password',
  browser: { selected: [], default: null },
  aiTools: [],
};
```

**Temp file cleanup pattern** (lines 94-117):
```typescript
let tmpDir: string;

beforeEach(async () => {
  tmpDir = join(tmpdir(), `tilde-contract-schema-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  try {
    await unlink(join(homedir(), '.tilde', 'tilde.config.json'));
  } catch {
    // ignore — file may not exist if writeConfig wasn't called
  }
});
```

**Write contract pattern** (lines 119-133):
```typescript
describe('writeConfig() — schemaVersion contract', () => {
  it('written config contains schemaVersion as a top-level field', async () => {
    const outputPath = await writeConfig(MINIMAL_CONFIG, tmpDir);
    const content = await readFile(outputPath, 'utf-8');
    const parsed = JSON.parse(content) as Record<string, unknown>;
    expect(parsed['schemaVersion']).toBeDefined();
  });
});
```

**Apply to:** update load contract so missing `schemaVersion` fails; add unknown-field strip/warning rewrite contract; keep write stamping contract.

---

### `tests/integration/cli-regression.test.ts` (test, request-response)

**Analog:** `tests/integration/cli-regression.test.ts`

**CLI harness pattern** (lines 1-7, 35-43, 74-81):
```typescript
import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import { chmod, mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const BIN = resolve(import.meta.dirname, '../..', 'dist/bin/tilde.js');

async function makeTempProject() {
  const rawDir = await mkdtemp(join(tmpdir(), 'tilde-cli-regression-'));
  const dir = await realpath(rawDir);
  const home = join(dir, 'home');
  await mkdir(home);
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, EDITOR: '/usr/bin/false' };
  delete env.TILDE_CONFIG;
  delete env.TILDE_CI;
  return { dir, home, env };
}

async function runCli(args: string[], options: { cwd: string; env: NodeJS.ProcessEnv }) {
  return execa('node', [BIN, ...args], {
    cwd: options.cwd,
    env: options.env,
    reject: false,
    timeout: 10_000,
    stdin: 'pipe',
  });
}
```

**No-config guidance table pattern** (lines 113-133):
```typescript
it.each([
  ['config validate', ['config', 'validate'], 'tilde config validate --config <path>'],
  ['config show', ['config', 'show'], 'tilde config show --config <path>'],
  ['config edit', ['config', 'edit'], 'tilde config edit --config <path>'],
])('prints shared no-config guidance for %s', async (_name, args, example) => {
  const { dir, env } = await makeTempProject();
  const result = await runCli(args, { cwd: dir, env });
  expect(result.exitCode).not.toBe(0);
  expect(result.stderr).toContain('Searched:');
  expect(result.stderr).toContain(example);
});
```

**Existing config command success pattern** (lines 135-149):
```typescript
it('auto-discovers config validate when no path is passed', async () => {
  const { dir, env } = await makeTempProject();
  await writeConfig(join(dir, 'tilde.config.json'));
  const result = await runCli(['config', 'validate'], { cwd: dir, env });
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('Config is valid');
});
```

**Apply to:** add `tilde config schema` and `tilde config schema --json` tests. Do not include `config schema` in no-config failure table because it should not resolve a config file.

## Shared Patterns

### NodeNext ESM Imports
**Source:** `src/config/reader.ts`, `src/index.tsx`, `scripts/validate-config-doc-example.ts`
**Apply to:** all new TypeScript modules and scripts
```typescript
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { TildeConfigSchema, type TildeConfig } from './schema.js';
```

Use relative imports with `.js` extensions for project modules.

### Deterministic CLI Output
**Source:** `src/index.tsx`
**Apply to:** `tilde config schema`, errors, help text
```typescript
process.stdout.write(JSON.stringify(config, null, 2) + '\n');
process.exit(0);

process.stderr.write(`Unknown config subcommand: ${sub}\n`);
process.exit(1);
```

### Atomic Config Rewrites
**Source:** `src/config/writer.ts`
**Apply to:** migration rewrite, unknown-field stripping, config update/reconfigure writes
```typescript
export async function atomicWriteConfig(targetPath: string, content: string): Promise<void> {
  const tmpPath = `${targetPath}.tmp`;
  await writeFile(tmpPath, content, 'utf-8');
  try {
    await rename(tmpPath, targetPath);
  } catch (err) {
    try { await unlink(tmpPath); } catch { /* ignore cleanup failure */ }
    throw err;
  }
}
```

### Config Validation Errors
**Source:** `src/config/reader.ts`
**Apply to:** load paths and config-first validation
```typescript
const result = TildeConfigSchema.safeParse(migrationResult.config);
if (!result.success) {
  const validationError = fromZodError(result.error);
  throw new Error(`Config validation failed:\n${validationError.message}`);
}
```

### Vitest File-I/O Isolation
**Source:** `tests/contract/config-schema.test.ts`
**Apply to:** schema contracts and metadata generation tests
```typescript
beforeEach(async () => {
  tmpDir = join(tmpdir(), `tilde-contract-schema-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  try {
    await unlink(join(homedir(), '.tilde', 'tilde.config.json'));
  } catch {
    // ignore
  }
});
```

### CLI Integration Harness
**Source:** `tests/integration/cli-regression.test.ts`
**Apply to:** `tilde config schema` coverage
```typescript
async function runCli(args: string[], options: { cwd: string; env: NodeJS.ProcessEnv }) {
  return execa('node', [BIN, ...args], {
    cwd: options.cwd,
    env: options.env,
    reject: false,
    timeout: 10_000,
    stdin: 'pipe',
  });
}
```

## No Analog Found

All planned files have usable analogs. The weakest match is `SchemaExplorer.astro`; there is no existing interactive Astro component in the docs site, so use Starlight MDX/page patterns plus generated schema metadata and keep browser-side scripting minimal.

## Metadata

**Analog search scope:** `src/config/`, `src/modes/`, `src/index.tsx`, `scripts/`, `site/docs/`, `tests/unit/config/`, `tests/contract/`, `tests/integration/`
**Files scanned:** 40+ targeted files from `rg` and `find`
**Pattern extraction date:** 2026-06-21
