# Phase 07: Config and Schema Versioning Foundation - Research

**Researched:** 2026-06-21
**Domain:** Node.js/TypeScript ESM CLI config schema versioning, Zod validation, generated schema metadata, Astro/Starlight docs
**Confidence:** HIGH for codebase behavior, MEDIUM for external library guidance

## User Constraints (from CONTEXT.md)

### Locked Decisions

### Config Schema Version Policy

- **D-01:** `schemaVersion` is the authoritative config format version for `tilde.config.json`.
- **D-02:** Use semver-style `major.minor` strings for schema versions, such as `"1.7"` and future `"2.0"`.
- **D-03:** Do not use patch versions in config `schemaVersion`; patch releases are package-level only unless the schema shape changes.
- **D-04:** Additive v1 schema changes should increment the minor version.
- **D-05:** Breaking schema changes should reserve a future major version, starting with `2.0`.
- **D-06:** Deprecate the existing top-level `version` field as meaningful config state; do not treat it as the source of schema truth.
- **D-07:** Successful migrations should keep the current atomic rewrite-on-load behavior.

### Compatibility and Validation Behavior

- **D-08:** Configs with missing `schemaVersion` are invalid. There is no real legacy-user compatibility burden yet because tilde is still establishing the base CLI tool.
- **D-09:** Future unsupported `schemaVersion` values should soft-block mutation and apply operations.
- **D-10:** Future unsupported configs may still be inspected through read/help/schema paths, and output should guide the user to upgrade tilde when ready.
- **D-11:** Unknown fields in supported-schema configs should be treated as likely user error.
- **D-12:** Unknown fields should produce clear warnings and be stripped on the next successful rewrite rather than preserved indefinitely.

### Scope Cleanup

- **D-13:** Remove `repos.json` from Phase 07 scope. GitHub issue #81 does not resolve in this repository, and the user identified it as likely stray scope related to `github-repo-factory`.
- **D-14:** Phase 07 should update roadmap/requirements before planning or execution so the widened website explorer scope is explicit and the `repos.json` requirement is removed.

### CLI Schema Viewer

- **D-15:** Add a CLI schema viewer at `tilde config schema`.
- **D-16:** Default CLI output should be a readable terminal tree with field type, required/default markers, and version notes.
- **D-17:** Add `tilde config schema --json` for machine-readable schema metadata.
- **D-18:** The schema viewer should serve both maintainers and end users, not only internal debugging.

### Docs-Site Schema Explorer

- **D-19:** Include the interactive docs-site schema explorer in Phase 07, widening the phase beyond the original CLI-only roadmap text.
- **D-20:** The explorer should be a dedicated Astro/Starlight page in the configuration section/sidebar.
- **D-21:** The explorer should use the same generated schema metadata as the CLI viewer to avoid documentation drift.
- **D-22:** The explorer should include a searchable schema tree, expand/collapse groups, and field details for type, default, required status, and version notes.
- **D-23:** Do not build a full in-browser config validator/playground in this phase.

### the agent's Discretion

- The planner may choose the internal generated metadata format, as long as it powers both `tilde config schema --json` and the website explorer.
- The planner may choose exact warning wording for unknown fields and future schema versions, as long as the behavior above is preserved.
- The planner may decide whether to remove or visually de-emphasize the top-level `version` field in docs first, as long as `schemaVersion` is clearly authoritative.

### Deferred Ideas (OUT OF SCOPE)

None. The requested website schema explorer was explicitly folded into Phase 07, and `repos.json` was removed as stray scope rather than deferred.

## Summary

Phase 07 should be planned as a schema-governance slice, not as a new integration slice. The existing runtime boundary is `TildeConfigSchema` in `src/config/schema.ts`, with migration and stamping spread across `src/config/migrations/runner.ts`, `src/config/reader.ts`, `src/config/writer.ts`, `src/modes/config-first.tsx`, `src/modes/reconfigure.tsx`, and `src/modes/update.tsx`. [VERIFIED: src/config/schema.ts] [VERIFIED: src/config/migrations/runner.ts] [VERIFIED: src/config/reader.ts] [VERIFIED: src/config/writer.ts] [VERIFIED: src/modes/config-first.tsx] [VERIFIED: src/modes/reconfigure.tsx] [VERIFIED: src/modes/update.tsx]

The most important technical risk is version ordering. The current migration runner compares versions with `parseFloat`, which makes semver-style minor versions such as `1.10` unsafe. [VERIFIED: src/config/migrations/runner.ts] Plan a small shared `major.minor` parser/comparator and update all migration/future-version behavior around it. [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md]

The schema viewer should be powered by explicit generated metadata rather than a fully hand-written docs table or raw `z.toJSONSchema()` alone. Zod 4 supports `z.toJSONSchema()`, metadata, and input/output conversion modes, but transforms are unrepresentable by default. [CITED: https://zod.dev/json-schema] The current `TildeConfigSchema` uses a transform on `schemaVersion`, and a local runtime check confirmed default `z.toJSONSchema(TildeConfigSchema)` throws `Transforms cannot be represented in JSON Schema`; `io: "input"` succeeds but treats defaulted fields differently from the user-facing contract. [VERIFIED: local zod runtime check] [VERIFIED: src/config/schema.ts]

**Primary recommendation:** Build a single `src/config/schema-metadata.ts` source/export plus a generated JSON artifact for the docs site; keep Zod as runtime validation, use a semver-aware migration runner, and wire `tilde config schema` plus the Starlight explorer to the same metadata. [VERIFIED: src/config/schema.ts] [CITED: https://zod.dev/json-schema]

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCHEMA-01 | `tilde.config.json` has a standardized versioning and migration pattern. | Use `schemaVersion` as authoritative, replace `parseFloat` comparison, require missing `schemaVersion` to fail, retain atomic rewrite-on-load for successful supported migrations. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md] |
| SCHEMA-02 | `repos.json` supports schema versioning for future compatibility. | Do not implement in Phase 07; CONTEXT.md locks removal as stray scope, so planner must update `REQUIREMENTS.md` and `ROADMAP.md` before implementation. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/ROADMAP.md] [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md] |
| SCHEMA-03 | tilde exposes a schema viewer so users and maintainers can inspect effective schema structure. | Implement `tilde config schema` and `tilde config schema --json`, then reuse the same metadata artifact in a Starlight schema explorer page. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: src/index.tsx] [VERIFIED: site/docs/astro.config.mjs] |

## Project Constraints (from AGENTS.md)

- Runtime is Node.js >=20 with TypeScript NodeNext; new TypeScript imports must preserve ESM `.js` import extensions. [VERIFIED: AGENTS.md] [VERIFIED: tsconfig.json]
- UI is Ink/React for terminal workflows; CLI schema output must also support non-interactive stdout paths. [VERIFIED: AGENTS.md] [VERIFIED: src/index.tsx]
- Product target is macOS-first, but schema inspection and config validation should remain read-only and safe in non-interactive paths. [VERIFIED: AGENTS.md] [VERIFIED: src/index.tsx]
- Discovery and schema inspection must be non-destructive by default. [VERIFIED: AGENTS.md]
- Do not resolve or persist raw secrets; config validation already rejects common raw secret prefixes in env var values. [VERIFIED: AGENTS.md] [VERIFIED: src/config/schema.ts]
- External commands such as `brew`, `gh`, `op`, `vfox`, and `defaultbrowser` must be mocked in automated tests. [VERIFIED: AGENTS.md]
- Keep schema changes, migrations, docs, and tests together. [VERIFIED: AGENTS.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Config version parsing/comparison | CLI runtime / config layer | Tests | `runMigrations()` currently owns version decisions before validation and rewrite. [VERIFIED: src/config/migrations/runner.ts] |
| Config validation and unknown-field handling | CLI runtime / config layer | CLI output | `TildeConfigSchema.safeParse()` currently strips unknown fields silently, so warning detection must compare raw input to parsed output before rewrite. [VERIFIED: src/config/schema.ts] [VERIFIED: local zod parse check] |
| Migration rewrite-on-load | CLI runtime / config reader/writer | Filesystem | `loadConfig()` and `ConfigFirstMode` already rewrite migrated local configs atomically. [VERIFIED: src/config/reader.ts] [VERIFIED: src/modes/config-first.tsx] |
| Future-schema soft block | CLI runtime / command routing | UI modes | `loadConfig()` warns but still validates; mutation/apply paths need a stronger typed state to stop writes for future versions. [VERIFIED: src/config/reader.ts] |
| CLI schema viewer | CLI entry layer | Config metadata module | `src/index.tsx` already routes `tilde config <validate|show|edit>` and should add `schema` there. [VERIFIED: src/index.tsx] |
| Docs schema explorer | Static docs site | Generated schema artifact | Starlight sidebar is explicit, and docs pages live under `site/docs/src/content/docs`. [VERIFIED: site/docs/astro.config.mjs] [CITED: https://starlight.astro.build/reference/configuration/#sidebar] |
| Docs/runtime drift prevention | Shared schema metadata | Validation scripts/tests | Existing docs are stale relative to runtime schema, and `scripts/validate-config-doc-example.ts` already validates docs examples against runtime Zod. [VERIFIED: site/docs/src/content/docs/config-format.md] [VERIFIED: site/docs/src/content/docs/config-reference.md] [VERIFIED: scripts/validate-config-doc-example.ts] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.4.5 installed; package.json pins `5.4`; npm latest checked as part of current stack context only. [VERIFIED: package-lock.json] [VERIFIED: package.json] | Type-safe config metadata, migration helpers, CLI code. | Existing repo compiler, strict mode, NodeNext ESM. [VERIFIED: tsconfig.json] |
| Node.js | 22.22.2 available locally; package requires >=20. [VERIFIED: node --version] [VERIFIED: package.json] | CLI runtime and JSON/file operations. | Existing runtime and CI-compatible target. [VERIFIED: package.json] [VERIFIED: .github/workflows/ci.yml via AGENTS.md] |
| Zod | 4.3.6 installed; registry latest 4.4.3, modified 2026-05-04. [VERIFIED: package-lock.json] [VERIFIED: npm registry] | Runtime config validation and optional JSON Schema/metadata support. | Existing validation boundary; no new package needed. [VERIFIED: src/config/schema.ts] |
| Vitest | 4.1.2 installed; registry latest 4.1.9, modified 2026-06-15. [VERIFIED: package-lock.json] [VERIFIED: npm registry] | Unit/integration/contract tests. | Existing test framework and config split. [VERIFIED: vitest.config.ts] [VERIFIED: vitest.integration.config.ts] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Astro | 6.1.1 installed in `site/docs`; registry latest 6.4.8, modified 2026-06-19. [VERIFIED: site/docs/package-lock.json] [VERIFIED: npm registry] | Static docs build. | Use for the schema explorer page only; do not add a separate docs app. [VERIFIED: site/docs/package.json] |
| @astrojs/starlight | 0.38.2 installed; registry latest 0.40.0, modified 2026-06-09. [VERIFIED: site/docs/package-lock.json] [VERIFIED: npm registry] | Documentation layout/sidebar. | Add schema explorer to existing configuration section/sidebar. [VERIFIED: site/docs/astro.config.mjs] [CITED: https://starlight.astro.build/reference/configuration/#sidebar] |
| execa | 9.6.1 declared. [VERIFIED: package.json] | CLI regression tests and existing command runner. | Use existing integration test pattern that shells out to `dist/bin/tilde.js`; do not introduce a new CLI harness. [VERIFIED: tests/integration/cli-regression.test.ts] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Explicit schema metadata module | Pure `z.toJSONSchema(TildeConfigSchema)` | Zod conversion is useful, but current transform/default behavior does not directly match user-facing required/default markers. [CITED: https://zod.dev/json-schema] [VERIFIED: local zod runtime check] |
| Existing Starlight docs page/component | Separate React app | Separate app would duplicate build/runtime concerns; existing Starlight site already has sidebar and content pages. [VERIFIED: site/docs/astro.config.mjs] |
| Existing Vitest/execa integration tests | Snapshot-only manual CLI checks | Current test suite already builds and shells out to `dist/bin/tilde.js`, matching the CLI behavior users see. [VERIFIED: tests/integration/cli-regression.test.ts] |

**Installation:**

```bash
# No new packages should be installed for Phase 07.
npm install
cd site/docs && npm install
```

**Version verification:** `npm view` was run with network approval for `zod`, `astro`, `@astrojs/starlight`, and `vitest`; local installed versions were checked from `package-lock.json` and executable probes. [VERIFIED: npm registry] [VERIFIED: package-lock.json]

## Package Legitimacy Audit

Phase 07 should not install new external packages. Existing stack packages were checked because they are recommended for reuse. The GSD package-legitimacy seam returned `SUS` for these packages only because it could not retrieve age/download/source signals in this environment; direct `npm view` registry metadata confirmed package existence, repository URLs, and no printed `scripts.postinstall` values. [VERIFIED: npm registry]

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| zod | npm | Created 2020-03-07. [VERIFIED: npm registry] | Not retrieved. [ASSUMED] | github.com/colinhacks/zod [VERIFIED: npm registry] | Existing dependency; seam `SUS` due unknown signals. | Reuse only; no install task. |
| astro | npm | Created 2021-03-13. [VERIFIED: npm registry] | Not retrieved. [ASSUMED] | github.com/withastro/astro [VERIFIED: npm registry] | Existing docs dependency; seam `SUS` due unknown signals. | Reuse only; no install task. |
| @astrojs/starlight | npm | Created 2023-05-08. [VERIFIED: npm registry] | Not retrieved. [ASSUMED] | github.com/withastro/starlight [VERIFIED: npm registry] | Existing docs dependency; seam `SUS` due unknown signals. | Reuse only; no install task. |
| vitest | npm | Created 2021-12-03. [VERIFIED: npm registry] | Not retrieved. [ASSUMED] | github.com/vitest-dev/vitest [VERIFIED: npm registry] | Existing dev dependency; seam `SUS` due unknown signals. | Reuse only; no install task. |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none for installation; existing packages had incomplete seam metadata only.

## Architecture Patterns

### System Architecture Diagram

```text
User / maintainer
  |
  +--> tilde config validate/show/install/update/reconfigure
  |      |
  |      +--> resolveConfigPath()
  |      +--> loadConfig()
  |             |
  |             +--> parse JSON
  |             +--> schemaVersion parser/comparator
  |             +--> future version?
  |             |      |
  |             |      +--> read/schema/help OK
  |             |      +--> mutation/apply soft-block
  |             |
  |             +--> supported older version?
  |             |      |
  |             |      +--> run ordered migrations
  |             |      +--> validate with TildeConfigSchema
  |             |      +--> atomic rewrite local file
  |             |
  |             +--> current supported version
  |                    |
  |                    +--> validate
  |                    +--> warn about unknown fields before rewrite/strip
  |
  +--> tilde config schema [--json]
         |
         +--> shared schema metadata module
                |
                +--> readable tree formatter
                +--> machine-readable JSON
                +--> generated docs artifact
                         |
                         +--> Starlight schema explorer page
```

### Recommended Project Structure

```text
src/config/
├── schema.ts                 # Runtime Zod validation boundary
├── schema-metadata.ts        # Shared field descriptors for CLI/docs
├── schema-version.ts         # major.minor parsing/comparison helpers
├── schema-viewer.ts          # Terminal tree and JSON formatting helpers
└── migrations/
    ├── runner.ts             # Semver-aware migration orchestration
    └── v1-5.ts               # Existing migration registration

scripts/
└── generate-schema-metadata.ts  # Writes docs-consumable JSON artifact

site/docs/src/
├── data/tilde-config-schema.json # Generated artifact consumed by docs
├── components/SchemaExplorer.astro
└── content/docs/config-schema.mdx
```

### Pattern 1: Semver-Style Schema Version Parsing

**What:** Parse only `major.minor` strings, reject missing, malformed, or patch-bearing config schema versions. [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md]

**When to use:** Every place that compares `schemaVersion`, including migration applicability and future-version detection. [VERIFIED: src/config/migrations/runner.ts]

**Example:**

```typescript
// Source: Phase 07 research synthesis from CONTEXT.md and runner.ts.
export interface SchemaVersion {
  major: number;
  minor: number;
  raw: string;
}

export function parseSchemaVersion(value: unknown): SchemaVersion {
  if (typeof value !== 'string') {
    throw new Error('schemaVersion must be a major.minor string, for example "1.7"');
  }
  const match = /^(\d+)\.(\d+)$/.exec(value);
  if (!match) {
    throw new Error('schemaVersion must use major.minor format without a patch version');
  }
  return { major: Number(match[1]), minor: Number(match[2]), raw: value };
}

export function compareSchemaVersions(a: SchemaVersion, b: SchemaVersion): number {
  return a.major === b.major ? a.minor - b.minor : a.major - b.major;
}
```

### Pattern 2: Shared Schema Metadata

**What:** Define field descriptors with `path`, `type`, `required`, `default`, `since`, `deprecated`, `description`, and nested `children`. [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md]

**When to use:** Power `tilde config schema`, `tilde config schema --json`, and the Starlight explorer from one source. [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md]

**Example:**

```typescript
// Source: Phase 07 research synthesis; keep imports NodeNext-compatible.
export interface ConfigSchemaField {
  path: string;
  label: string;
  type: string;
  required: boolean;
  defaultValue?: unknown;
  since: string;
  deprecated?: string;
  description: string;
  children?: ConfigSchemaField[];
}

export const tildeConfigSchemaMetadata = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  fields: [
    {
      path: 'schemaVersion',
      label: 'schemaVersion',
      type: 'string',
      required: true,
      since: '1.0',
      description: 'Authoritative tilde.config.json schema format version.',
    },
  ],
} as const;
```

### Pattern 3: CLI Schema Subcommand Without Config Resolution

**What:** `tilde config schema` should not require an existing config file because it inspects tilde's effective supported schema, not a user's config. [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md]

**When to use:** Add a fast path before `resolveRequiredConfigPath()` in `handleConfigSubcommand()`. [VERIFIED: src/index.tsx]

**Example:**

```typescript
// Source: src/index.tsx routing pattern plus Phase 07 context.
if (sub === 'schema') {
  const json = process.argv.includes('--json');
  process.stdout.write(json
    ? JSON.stringify(tildeConfigSchemaMetadata, null, 2) + '\n'
    : formatConfigSchemaTree(tildeConfigSchemaMetadata));
  process.exit(0);
}
```

### Anti-Patterns to Avoid

- **Using `parseFloat` for schema versions:** It misorders `1.10` and `1.6`; use tuple comparison. [VERIFIED: src/config/migrations/runner.ts]
- **Letting `tilde config schema` require `--config`:** Schema inspection is about installed tilde capabilities, not a selected config file. [VERIFIED: src/index.tsx] [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md]
- **Duplicating docs tables by hand:** Current docs already drift from runtime schema around `1.5`/`1.6`, `packageManager`/`packageManagers`, and browser shape. [VERIFIED: docs/config-format.md] [VERIFIED: site/docs/src/content/docs/config-format.md] [VERIFIED: src/config/schema.ts]
- **Treating future configs as normal parsed configs:** Existing `loadConfig()` only warns, then validates; mutation paths need a soft-block contract. [VERIFIED: src/config/reader.ts]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Runtime validation | A custom JSON validator | Existing `TildeConfigSchema` with focused refinements | Already enforces macOS literals, enums, env secret patterns, and cross-field manager checks. [VERIFIED: src/config/schema.ts] |
| Atomic config writes | Manual partial overwrite | Existing `atomicWriteConfig()` | Existing writer uses temp file plus rename and cleanup. [VERIFIED: src/config/writer.ts] |
| CLI process tests | Bespoke subprocess harness | Existing Vitest + execa pattern | `tests/integration/cli-regression.test.ts` already executes `dist/bin/tilde.js` with temp dirs and env. [VERIFIED: tests/integration/cli-regression.test.ts] |
| Docs framework | New web app or bundler | Existing Astro/Starlight site | Docs site already has Starlight and explicit sidebar configuration. [VERIFIED: site/docs/package.json] [VERIFIED: site/docs/astro.config.mjs] |
| JSON Schema conversion internals | Custom Zod AST walker as the sole source | Explicit metadata plus optional `z.toJSONSchema(..., { io: "input" })` checks | Zod documents transforms as unrepresentable by default, and local schema conversion throws in output mode. [CITED: https://zod.dev/json-schema] [VERIFIED: local zod runtime check] |

**Key insight:** The hard part is not rendering a tree; it is keeping runtime validation, migration behavior, CLI inspection, and docs synchronized while preserving non-destructive config handling. [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md] [VERIFIED: src/config/reader.ts]

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | User `tilde.config.json` files can exist in cwd, git root, `~/.tilde/tilde.config.json`, `~/.config/tilde/tilde.config.json`, and `~/tilde.config.json`; discovery is fixed-path, not recursive. [VERIFIED: src/utils/config-discovery.ts] | Code must treat missing `schemaVersion` as invalid, migrate supported older versions atomically, and avoid rewriting future unsupported versions. |
| Live service config | None found; tilde has no database/backend service and Phase 07 removes stray `repos.json` scope. [VERIFIED: .planning/STATE.md] [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md] | None. |
| OS-registered state | None found for schema versioning; macOS side effects are installer/dotfile domains, not schema metadata. [VERIFIED: AGENTS.md] [VERIFIED: src/config/reader.ts] | None. |
| Secrets/env vars | `TILDE_CONFIG`, `TILDE_CI`, `TILDE_STATE_DIR`, and `TILDE_NO_COLOR` exist; no secret env var names are part of schema versioning. [VERIFIED: package/project docs via AGENTS.md] [VERIFIED: src/index.tsx] | Keep raw secret validation unchanged; do not inspect secret values for schema viewer. |
| Build artifacts | `dist/` contains compiled copies of schema/migration/index code; tests and CLI integration use built `dist/bin/tilde.js`. [VERIFIED: dist/config/migrations/runner.js] [VERIFIED: tests/integration/cli-regression.test.ts] | Planner must include `npm run build` before integration CLI checks and treat stale `dist/` as a verification risk. |

**Nothing found in category:** Live service config and OS-registered state are explicitly none for Phase 07 based on current file-based architecture. [VERIFIED: .planning/STATE.md] [VERIFIED: AGENTS.md]

## Common Pitfalls

### Pitfall 1: Version Comparison Regression

**What goes wrong:** `1.10` sorts before `1.6` if compared as floats. [VERIFIED: src/config/migrations/runner.ts]
**Why it happens:** Current runner uses `parseFloat()` for source, target, and migration keys. [VERIFIED: src/config/migrations/runner.ts]
**How to avoid:** Centralize `parseSchemaVersion()` and `compareSchemaVersions()`, then use it in future-version checks and migration-key sorting. [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md]
**Warning signs:** Tests only cover `1.5`, `1.6`, and `99` instead of `1.10`, `2.0`, malformed, and missing values. [VERIFIED: tests/unit/config/migration-runner.test.ts]

### Pitfall 2: Missing `schemaVersion` Still Defaults

**What goes wrong:** Current schema and runner allow missing `schemaVersion` to become current or baseline depending on path. [VERIFIED: src/config/schema.ts] [VERIFIED: src/config/migrations/runner.ts]
**Why it happens:** `TildeConfigSchema` has `.default('1.6')`, and `runMigrations()` treats absent values as `'1'`. [VERIFIED: src/config/schema.ts] [VERIFIED: src/config/migrations/runner.ts]
**How to avoid:** Remove schema default for persisted config validation, make missing schema version a clear validation/migration error, and update tests that currently assert defaulting. [VERIFIED: tests/unit/config/schema-v2.test.ts] [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md]
**Warning signs:** Tests still expect `config without schemaVersion field defaults to "1.6"` or `missing schemaVersion defaults to "1"`. [VERIFIED: tests/unit/config/schema-v2.test.ts] [VERIFIED: tests/unit/config/migration-runner.test.ts]

### Pitfall 3: Future-Version Warning Without Soft Block

**What goes wrong:** A future config can be loaded into mutation/apply paths after a warning. [VERIFIED: src/config/reader.ts]
**Why it happens:** `loadConfig()` returns only `TildeConfig`, not a load result carrying `isFutureVersion` or mutation safety. [VERIFIED: src/config/reader.ts]
**How to avoid:** Add a load-result variant or helper for mutation commands so read/schema/help can proceed but apply/update/reconfigure saves are blocked. [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md]
**Warning signs:** `loadResolvedConfig()` is reused by `validate`, `show`, `update`, context, and startup without differentiating read-only from mutation intent. [VERIFIED: src/index.tsx]

### Pitfall 4: Docs Drift Continues

**What goes wrong:** Docs say `schemaVersion: "1.5"` and `packageManager`, while runtime schema uses `1.6` and `packageManagers`. [VERIFIED: site/docs/src/content/docs/config-format.md] [VERIFIED: docs/config-format.md] [VERIFIED: src/config/schema.ts]
**Why it happens:** Docs are hand-maintained. [VERIFIED: scripts/validate-config-doc-example.ts]
**How to avoid:** Generate the schema explorer metadata from a checked-in TypeScript source and add a validation script/test that fails when generated docs data is stale. [VERIFIED: scripts/validate-config-doc-example.ts]
**Warning signs:** Updating `src/config/schema.ts` without touching metadata, generated artifact, docs, and tests. [VERIFIED: AGENTS.md]

### Pitfall 5: Zod JSON Schema Export Overreach

**What goes wrong:** The planner expects raw `z.toJSONSchema()` to provide all user-facing schema notes. [CITED: https://zod.dev/json-schema]
**Why it happens:** Zod has built-in JSON Schema conversion, but transforms are unrepresentable by default and input mode changes required/default semantics. [CITED: https://zod.dev/json-schema] [VERIFIED: local zod runtime check]
**How to avoid:** Use explicit metadata as the UI/docs source and optionally compare or enrich it with Zod JSON Schema output. [VERIFIED: src/config/schema.ts]
**Warning signs:** Generated viewer says `schemaVersion` is optional because input-mode JSON Schema follows parser input defaults instead of Phase 07's persisted-config policy. [VERIFIED: local zod runtime check] [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md]

## Code Examples

### Unknown Field Detection Before Strip

```typescript
// Source: Zod object strip behavior verified locally; Phase 07 requires warnings.
const rawKeys = new Set(Object.keys(rawConfig));
const parsed = TildeConfigSchema.safeParse(rawConfig);
if (!parsed.success) throw parsed.error;

const parsedKeys = new Set(Object.keys(parsed.data));
const unknownKeys = [...rawKeys].filter(key => !parsedKeys.has(key));
if (unknownKeys.length > 0) {
  warnUnknownFields(unknownKeys);
}
```

### Config Schema CLI Formatter

```typescript
// Source: src/index.tsx deterministic stdout pattern.
export function formatConfigSchemaTree(metadata: ConfigSchemaMetadata): string {
  const lines = [`tilde.config.json schema ${metadata.schemaVersion}`];
  for (const field of metadata.fields) {
    const markers = [
      field.required ? 'required' : 'optional',
      field.defaultValue !== undefined ? `default: ${JSON.stringify(field.defaultValue)}` : undefined,
      field.deprecated ? `deprecated: ${field.deprecated}` : undefined,
    ].filter(Boolean).join(', ');
    lines.push(`${field.path}  ${field.type}  ${markers}`);
  }
  return `${lines.join('\n')}\n`;
}
```

### Docs Artifact Generation

```typescript
// Source: package scripts already use tsx for docs validation.
import { writeFile } from 'node:fs/promises';
import { tildeConfigSchemaMetadata } from '../src/config/schema-metadata.js';

await writeFile(
  new URL('../site/docs/src/data/tilde-config-schema.json', import.meta.url),
  `${JSON.stringify(tildeConfigSchemaMetadata, null, 2)}\n`,
  'utf-8',
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Floating-point schema comparisons | Tuple comparison of `major.minor` strings | Phase 07 should change this. [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md] | Prevents incorrect migration ordering for `1.10` and future `2.0`. |
| `version` as meaningful config state | `schemaVersion` authoritative, `version` deprecated | Locked for Phase 07. [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md] | Reduces ambiguity between package release version and config format version. |
| Hand-maintained config docs | Shared generated schema metadata consumed by CLI and docs site | Locked for Phase 07. [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md] | Avoids docs drift already visible in repo. |
| Missing schemaVersion treated as legacy/default | Missing schemaVersion invalid | Locked for Phase 07. [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md] | Establishes a clean base contract before wider search/resource schema work. |

**Deprecated/outdated:**

- Top-level `version` as schema authority is deprecated by decision; keep only if needed for compatibility and visually de-emphasize in docs. [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md]
- `repos.json` in Phase 07 roadmap/requirements is outdated scope and should be removed before planning implementation tasks. [VERIFIED: .planning/ROADMAP.md] [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md]
- Docs references to schema `1.5`, `packageManager`, and stale browser object shape are outdated. [VERIFIED: docs/config-format.md] [VERIFIED: site/docs/src/content/docs/config-format.md] [VERIFIED: src/config/schema.ts]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | npm weekly download counts were not retrieved for existing packages. [ASSUMED] | Package Legitimacy Audit | Low for Phase 07 because no package installation is recommended. |
| A2 | The generated docs artifact path `site/docs/src/data/tilde-config-schema.json` is planner-adjustable. [ASSUMED] | Recommended Project Structure | Low; any stable checked-in path works if CLI and docs share the same source. |
| A3 | The schema metadata module can be authored manually at first and later generated more deeply from Zod metadata. [ASSUMED] | Architecture Patterns | Medium; if the user expects pure generation, planner should add a checkpoint before implementation. |

## Open Questions (RESOLVED)

1. **Should `CURRENT_SCHEMA_VERSION` become `1.7` in Phase 07?**
   - What we know: package version is `1.7.0`, current schema version constant is `1.6`, and Phase 07 adds schema policy/viewer behavior. [VERIFIED: package.json] [VERIFIED: src/config/migrations/runner.ts]
   - RESOLVED: Bump `CURRENT_SCHEMA_VERSION` to `"1.7"` because Phase 07 changes persisted config semantics: missing `schemaVersion` becomes invalid, `version` is deprecated as schema authority, and supported configs gain explicit future-version mutation safety. This is a schema contract change, not only a viewer feature.

2. **How strict should unknown-field warnings be for nested objects?**
   - What we know: Zod strips unknown object fields by default, and Phase 07 requires warnings plus stripping on next successful rewrite. [CITED: https://zod.dev/json-schema] [VERIFIED: local zod parse check]
   - RESOLVED: Report nested unknown-field paths when they can be determined, using concise dot/bracket paths such as `contexts[0].unknownKey`. Top-level-only warnings are insufficient for config authors editing nested arrays and objects. The CLI should summarize when many paths exist, but tests should cover nested path extraction.

3. **Should schema metadata include exact examples for every field in Phase 07?**
   - What we know: CLI and docs need type/default/required/version notes. [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md]
   - RESOLVED: Do not require examples for every field in the first metadata version. Include examples only where they prevent ambiguity or unsafe usage, especially backend-reference values such as `op://...`, nested `contexts[].languageBindings`, and deprecated `version` guidance.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | CLI build/tests/scripts | yes | 22.22.2 [VERIFIED: node --version] | Must be >=20. [VERIFIED: package.json] |
| npm | package scripts | yes | 10.9.7 [VERIFIED: npm --version] | None needed. |
| TypeScript compiler | `npm run build` | yes | 5.4.5 [VERIFIED: node_modules/.bin/tsc --version] | None; project build requires it. |
| Vitest | unit/integration tests | yes | 4.1.2 [VERIFIED: node_modules/.bin/vitest --version] | None; project test configs use Vitest. |
| Astro CLI | docs build | yes | 6.1.1 [VERIFIED: site/docs/node_modules/.bin/astro --version] | Docs explorer can be code-reviewed without build, but phase gate should build docs. |
| npm registry network | version verification | yes with approval | zod 4.4.3 latest; Astro 6.4.8 latest; Starlight 0.40.0 latest; Vitest 4.1.9 latest. [VERIFIED: npm registry] | Use package-lock when offline. |

**Missing dependencies with no fallback:** none found.

**Missing dependencies with fallback:** none found.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 with Node environment. [VERIFIED: vitest.config.ts] [VERIFIED: package-lock.json] |
| Config file | `vitest.config.ts`, `vitest.integration.config.ts`, `vitest.contract.config.ts`. [VERIFIED: package.json] |
| Quick run command | `npm run test -- tests/unit/config/migration-runner.test.ts tests/unit/config/schema-v2.test.ts` |
| Full suite command | `npm run build && npm test && npm run test:integration && npm run test:contract && npm run validate:config-doc && cd site/docs && npm run build` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| SCHEMA-01 | `schemaVersion` required, major.minor only, no patch, semver-aware comparison, supported migrations rewrite atomically. | unit/integration | `npm run test -- tests/unit/config/migration-runner.test.ts tests/unit/config/schema-v2.test.ts tests/unit/config-first.test.ts` | Existing files yes; expectations need update. [VERIFIED: tests/unit/config/migration-runner.test.ts] |
| SCHEMA-01 | Future unsupported schema blocks mutation/apply but allows read/schema paths. | unit/integration | `npm run test -- tests/unit/config-first.test.ts tests/unit/reconfigure.test.ts tests/integration/cli-regression.test.ts` | Existing files yes; new cases needed. [VERIFIED: tests/unit/config-first.test.ts] [VERIFIED: tests/unit/reconfigure.test.ts] |
| SCHEMA-02 | `repos.json` not part of Phase 07 after requirements cleanup. | planning/doc verification | `rg -n "repos\\.json" .planning/REQUIREMENTS.md .planning/ROADMAP.md` | Existing planning files yes; must update. [VERIFIED: .planning/REQUIREMENTS.md] [VERIFIED: .planning/ROADMAP.md] |
| SCHEMA-03 | `tilde config schema` prints readable tree without requiring config. | integration | `npm run build && npm run test:integration -- tests/integration/cli-regression.test.ts` | Existing file yes; new cases needed. [VERIFIED: tests/integration/cli-regression.test.ts] |
| SCHEMA-03 | `tilde config schema --json` emits machine-readable metadata matching docs artifact. | unit/integration/docs | `npm run test -- tests/unit/config/schema-metadata.test.ts && npm run build && npm run test:integration -- tests/integration/cli-regression.test.ts` | New unit file needed. |
| SCHEMA-03 | Starlight explorer consumes generated schema metadata. | docs build/smoke | `cd site/docs && npm run build` | Docs site exists; explorer files new. [VERIFIED: site/docs/package.json] |

### Sampling Rate

- **Per task commit:** `npm run test -- tests/unit/config/migration-runner.test.ts tests/unit/config/schema-v2.test.ts`
- **Per wave merge:** `npm run build && npm test && npm run test:integration`
- **Phase gate:** Full suite plus docs build and docs metadata validation.

### Wave 0 Gaps

- [ ] `tests/unit/config/schema-version.test.ts` - covers `major.minor` parse/compare, malformed values, patch rejection, `1.10` ordering, and future `2.0`.
- [ ] `tests/unit/config/schema-metadata.test.ts` - covers metadata shape, current version, field paths, required/default/deprecated markers.
- [ ] `tests/unit/config/unknown-fields.test.ts` or equivalent - covers warning path extraction before Zod stripping.
- [ ] `tests/integration/cli-regression.test.ts` additions - covers `tilde config schema`, `tilde config schema --json`, no-config behavior, future-version read vs mutation behavior.
- [ ] Docs generation validation script - covers generated schema artifact freshness.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | No authentication/session feature in Phase 07. [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md] |
| V3 Session Management | no | No sessions in local CLI. [VERIFIED: AGENTS.md] |
| V4 Access Control | no | No multi-user authorization boundary; local filesystem permissions apply. [ASSUMED] |
| V5 Input Validation | yes | Zod validation, semver parser, JSON parse errors, and explicit schema metadata validation. [VERIFIED: src/config/schema.ts] |
| V6 Cryptography | yes, limited | Do not resolve/persist raw secrets; retain env var secret-pattern rejection and backend-reference posture. [VERIFIED: AGENTS.md] [VERIFIED: src/config/schema.ts] |

### Known Threat Patterns for Node.js Config CLI

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Raw secret persistence through config examples or schema viewer | Information Disclosure | Keep schema viewer structural only; do not read user env values or resolve backend references. [VERIFIED: AGENTS.md] |
| Unsupported future config mutation | Tampering | Soft-block apply/update/reconfigure writes when `schemaVersion` is newer than supported. [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md] |
| Malformed schema version bypass | Tampering | Reject missing/malformed/patch schema versions before migration or validation. [VERIFIED: .planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md] |
| Docs script importing untrusted data | Tampering | Generate docs metadata from checked-in TypeScript source only; do not fetch remote data at build time. [ASSUMED] |

## Sources

### Primary (HIGH confidence)

- `AGENTS.md` - project runtime, safety, security, and testing constraints.
- `.planning/phases/07-config-and-schema-versioning-foundation/07-CONTEXT.md` - locked Phase 07 decisions.
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md` - current requirements, stale `repos.json` scope, and milestone status.
- `src/config/schema.ts` - runtime Zod schema, defaults, transform, secret validation, cross-field checks.
- `src/config/migrations/runner.ts` - current migration registry, `CURRENT_SCHEMA_VERSION`, `parseFloat` risk.
- `src/config/reader.ts`, `src/config/writer.ts`, `src/modes/config-first.tsx`, `src/modes/reconfigure.tsx`, `src/modes/update.tsx` - migration/rewrite/mutation flows.
- `src/index.tsx` - CLI subcommand routing and stdout/stderr conventions.
- `tests/unit/config/migration-runner.test.ts`, `tests/unit/config/schema-v2.test.ts`, `tests/integration/cli-regression.test.ts` - existing test expectations and CLI patterns.
- `docs/config-format.md`, `site/docs/src/content/docs/config-format.md`, `site/docs/src/content/docs/config-reference.md` - docs drift evidence.
- `site/docs/astro.config.mjs`, `site/docs/package.json` - Starlight docs integration.

### Secondary (MEDIUM confidence)

- `https://zod.dev/json-schema` - Zod 4 JSON Schema conversion, transform limitations, `io: "input"`, metadata, object strip/additionalProperties behavior.
- `https://starlight.astro.build/reference/configuration/#sidebar` - Starlight sidebar item patterns.
- `https://docs.astro.build/en/guides/content-collections/` - Astro local JSON/content loader options.
- npm registry `npm view` for `zod`, `astro`, `@astrojs/starlight`, and `vitest` version/source metadata.

### Tertiary (LOW confidence)

- GSD package-legitimacy seam for existing packages returned incomplete `SUS` results because metadata signals were unknown; not used to recommend installs.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - existing dependencies verified from `package.json`, lockfiles, local CLIs, and npm registry version lookups.
- Architecture: HIGH - implementation seams verified directly in source files and tests.
- Pitfalls: HIGH - based on direct code/test behavior and an executed local Zod conversion check.
- External docs: MEDIUM - official docs fetched on 2026-06-21 and registry versions checked, but packages are fast-moving.

**Research date:** 2026-06-21
**Valid until:** 2026-07-21 for codebase-specific findings; 2026-06-28 for npm registry latest-version facts.
