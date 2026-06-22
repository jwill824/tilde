---
phase: 07-config-and-schema-versioning-foundation
reviewed: 2026-06-22T01:06:13Z
depth: standard
files_reviewed: 31
files_reviewed_list:
  - src/config/schema-version.ts
  - src/config/schema.ts
  - src/config/migrations/runner.ts
  - src/config/migrations/v1-5.ts
  - src/config/migrations/v1.ts
  - src/config/reader.ts
  - src/config/schema-metadata.ts
  - src/config/schema-viewer.ts
  - src/index.tsx
  - src/modes/config-first.tsx
  - src/modes/reconfigure.tsx
  - src/modes/update.tsx
  - scripts/generate-schema-metadata.ts
  - package.json
  - site/docs/astro.config.mjs
  - site/docs/src/data/tilde-config-schema.json
  - site/docs/src/components/SchemaExplorer.astro
  - site/docs/src/content/docs/config-schema.mdx
  - site/docs/src/content/docs/config-format.md
  - docs/config-format.md
  - tests/unit/config/schema-version.test.ts
  - tests/unit/config/schema-v2.test.ts
  - tests/unit/config/migration-runner.test.ts
  - tests/contract/config-schema.test.ts
  - tests/unit/config/schema-metadata.test.ts
  - tests/unit/config/schema-viewer.test.ts
  - tests/integration/cli-regression.test.ts
  - tests/unit/config-first.test.ts
  - tests/unit/reconfigure.test.ts
  - tests/unit/update-command.test.ts
  - tests/unit/config/schema-metadata-artifact.test.ts
findings:
  critical: 2
  warning: 1
  info: 0
  total: 3
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-06-22T01:06:13Z
**Depth:** standard
**Files Reviewed:** 31
**Status:** issues_found

## Summary

Reviewed the schema versioning, migration, config loading, CLI integration, generated schema metadata, docs, and associated tests. The main defects are mutation-safety regressions: read-style config loads can rewrite and strip data, and config-first recovery can write a migrated config before the recovered config is valid or accepted.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01 [BLOCKER]: Read-only config loads can rewrite and drop user fields

**File:** `src/config/reader.ts:141`

**Issue:** `loadConfigWithMetadata()` rewrites the selected config whenever `unknownFields.length > 0`, even if the caller is a read-only command such as `tilde config validate`, `tilde config show`, or `tilde context list` via `loadResolvedConfig()` in `src/index.tsx`. Because Zod strips unknown object keys, this path persists `result.data` and removes every unknown field from disk just by validating or showing a config. That violates the project safety rule that scanning/reporting should be non-destructive by default and creates data loss risk for user-managed metadata or fields from adjacent tooling.

**Fix:**
```ts
export interface LoadConfigOptions {
  rewrite?: boolean;
  onMigrated?: (result: MigrationResult) => void;
}

// Default to read-only loads. Only explicit apply/reconfigure/update flows should rewrite.
if (
  options.rewrite === true &&
  !migrationResult.isFutureVersion &&
  !pathOrUrl.startsWith('http') &&
  migrationResult.didMigrate
) {
  await atomicWriteConfig(expandedPath, JSON.stringify(result.data, null, 2) + '\n');
  options.onMigrated?.(migrationResult);
}
```

Also stop treating unknown-field stripping as an automatic rewrite condition; warn/report it, but preserve the original file unless the user explicitly chooses a mutating operation.

### CR-02 [BLOCKER]: Config-first recovery writes invalid migrated configs before user acceptance

**File:** `src/modes/config-first.tsx:119`

**Issue:** In the validation-error fallback, `ConfigFirstMode` runs migrations and immediately calls `atomicWriteConfig()` when `migrationResult.didMigrate` is true, before `validateAndTransition()` proves the config is complete. For an older config that is missing `shell` or `contexts`, this branch stamps and writes the migrated config even though the UI is about to ask the user to recover missing fields. If the user cancels or recovery fails, the original config has still been modified and may remain invalid.

**Fix:**
```ts
const migrationResult = runMigrations(raw, CURRENT_SCHEMA_VERSION);
setPhase(validateAndTransition(migrationResult.config as Record<string, unknown>));
```

Defer any write until the config has passed `TildeConfigSchema` validation and the user has confirmed apply/recovery. If migration persistence is still needed in this mode, route it through the same validated rewrite path as `loadConfigWithMetadata({ rewrite: true })`.

## Warnings

### WR-01 [WARNING]: Published config examples do not match the runtime schema

**File:** `site/docs/src/content/docs/config-format.md:22`

**Issue:** The docs site publishes invalid examples for the current schema: `versionManagers` includes `"mise"` even though `VersionManagerChoiceSchema` only accepts `vfox`, `nvm`, `pyenv`, and `sdkman`; the browser examples use `{ "name": "arc", "isDefault": true }` instead of `{ "selected": [...], "default": ... }`; and the AI tool examples omit required `label` and `variant` fields. Users copying these examples will fail validation.

**Fix:** Update the examples and valid-values table to match `src/config/schema.ts`:
```json
{
  "versionManagers": [{ "name": "vfox" }],
  "browser": { "selected": ["arc"], "default": "arc" },
  "aiTools": [
    { "name": "claude-code", "label": "Claude Code", "variant": "cli-tool" }
  ]
}
```

---

_Reviewed: 2026-06-22T01:06:13Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
