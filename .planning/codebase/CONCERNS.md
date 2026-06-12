# Codebase Concerns

**Analysis Date:** 2026-06-12

## Tech Debt

**Plugin registry does not register every first-party plugin module:**
- Issue: `src/plugins/registry.ts` registers Homebrew, GitHub CLI, 1Password, direnv, vfox, HTTPS, and SSH, but browser/editor/AI plugin collections exist outside that registry.
- Files: `src/plugins/registry.ts`, `src/plugins/first-party/browser/index.ts`, `src/plugins/first-party/ai-tools/index.ts`, `src/plugins/first-party/vscode/index.ts`, `src/plugins/first-party/cursor/index.ts`, `src/plugins/first-party/zed/index.ts`.
- Impact: Code that expects `pluginRegistry.getAll('browser')`, `getAll('editor')`, or `getAll('ai-tool')` may return empty unless those modules are consumed through separate exports.
- Fix approach: Decide whether these categories should be registry-backed; if yes, register them centrally and add contract tests.

**Subcommands and UI mode selection share a large entry file:**
- Issue: `src/index.tsx` combines arg parsing, help text, subcommand handlers, config discovery, platform checks, and Ink rendering.
- Impact: Adding commands risks regressions in unrelated startup behavior.
- Fix approach: Extract subcommand handlers and argument parsing into focused modules with CLI regression tests.

**Install/apply currently has limited dry-run propagation:**
- Issue: `NonInteractiveMode` passes `dryRun` to both `installAll()` and `writeAll()`, but `ConfigFirstMode.applyConfig()` calls `writeAll(config)` without a dry-run option.
- Files: `src/app.tsx`, `src/modes/config-first.tsx`, `src/dotfiles/writer.ts`.
- Impact: Verify before extending dry-run semantics; config-first dry-run behavior may be incomplete.
- Fix approach: Thread dry-run consistently through config-first apply paths and add integration tests.

## Known Bugs

**No confirmed runtime bugs from this mapping pass.**
- Scope: This was a static map, not a full manual QA pass.
- Recommendation: Use existing integration tests before modifying wizard navigation, config discovery, or apply behavior.

## Security Considerations

**External shell command execution:**
- Risk: Plugins execute local tools such as `brew`, `gh`, `op`, `vfox`, `git`, and `defaultbrowser`.
- Files: `src/utils/exec.ts`, `src/plugins/first-party/*/index.ts`, `src/steps/browser.tsx`.
- Current mitigation: Commands are passed as executable plus args for most calls, and failures are wrapped in `PluginError`.
- Special care: `src/plugins/first-party/homebrew/index.ts` runs a shell command to execute the official Homebrew install script.
- Recommendation: Avoid adding string-built shell commands. Prefer `run(file, args)` and validate user-supplied values before passing them to commands.

**Secret handling depends on prefix detection:**
- Risk: `SECRET_PATTERN` catches common prefixes but cannot identify every raw secret format.
- Files: `src/config/schema.ts`, `src/config/writer.ts`.
- Current mitigation: Rejects values beginning with `ghp_`, `sk-`, `AKIA`, and Slack token prefixes.
- Recommendation: Keep env var values as backend references and expand tests when adding supported secret providers.

**Remote config loading:**
- Risk: `loadConfig()` accepts `http://` and `https://` URLs and fetches config content.
- File: `src/config/reader.ts`.
- Current mitigation: Zod validation and migrations still run.
- Recommendation: Be careful before adding side effects during config load; remote config should remain data-only.

## Performance Bottlenecks

**Environment capture can call multiple external tools:**
- Problem: Environment scanning checks dotfiles, Homebrew packages, detected languages, and version managers.
- Files: `src/capture/scanner.ts`, `src/utils/env-detection.ts`.
- Cause: External command calls may be slow or unavailable on fresh machines.
- Current mitigation: Several scanners catch failures and return empty/unknown results.
- Improvement path: Preserve timeouts for detection calls and avoid serializing independent probes.

**Homebrew package installation is sequential:**
- Problem: `installAll()` and Homebrew `installPackages()` process tools in sequence.
- Files: `src/installer/index.ts`, `src/plugins/first-party/homebrew/index.ts`.
- Impact: Safer output but slower for large tool lists.
- Improvement path: Keep sequential behavior unless parallel install is proven safe for Homebrew and UX.

## Fragile Areas

**Wizard navigation and checkpointing:**
- Why fragile: `src/modes/wizard.tsx` stores current step, history, popped frame, completed summaries, resume state, and partial config.
- Common failures: Back navigation can restore stale values; adding a step can break indices and summary mapping.
- Safe modification: Update `STEP_REGISTRY`, `getNextStep()`, `makeSummaryLines()`, `extractStepValues()`, and wizard tests together.
- Test coverage: `tests/unit/wizard-navigation.test.ts` and `tests/integration/wizard-flow.test.tsx` are the first places to update.

**Config schema and migrations:**
- Why fragile: Existing configs must migrate before validation.
- Common failures: New required fields break old configs or docs examples.
- Safe modification: Add migration steps in `src/config/migrations/`, update `CURRENT_SCHEMA_VERSION`, update docs, and run `npm run validate:config-doc`.
- Test coverage: `tests/unit/config/`, `tests/unit/config-schema.test.ts`, `tests/unit/config/schema-v2.test.ts`, and `tests/contract/config-schema.test.ts`.

**External command boundaries:**
- Why fragile: Local machine state varies widely.
- Common failures: Missing Homebrew, missing GitHub CLI, command prompts, timeouts, and non-macOS behavior.
- Safe modification: Mock `execa` and `run()` in tests; avoid assuming installed tools unless `isAvailable()` checks them.

**TTY and Ink lifecycle:**
- Why fragile: Interactive mode requires a TTY and Ink can hide the cursor.
- Files: `src/index.tsx`, `src/app.tsx`.
- Common failures: Piped install scripts or interrupted renders leave poor terminal state.
- Safe modification: Preserve the TTY guard and cursor restoration handlers.

## Scaling Limits

**Local-only product model:**
- Current capacity: One developer machine per CLI invocation.
- Limit: No central orchestration, fleet state, or team dashboard.
- Scaling path: Keep config deterministic and idempotent; introduce shared state only with a strong product reason.

**Plugin installation model:**
- Current capacity: First-party local integrations.
- Limit: Community plugin installation exists as `tilde plugin add`, but registry/discovery is minimal.
- Scaling path: Formalize plugin packaging, metadata, and safety checks before encouraging arbitrary third-party plugins.

## Dependencies at Risk

**Ink and React terminal UI compatibility:**
- Risk: Ink major versions can change rendering/test behavior.
- Impact: Wizard and integration tests may fail after upgrades.
- Migration plan: Upgrade Ink with `ink-testing-library` and integration tests in the same change.

**Node version drift:**
- Risk: Package allows Node >=20 while CI runs Node 22.
- Impact: Features accidentally relying on Node 22 may ship despite the Node 20 engine range.
- Migration plan: Either test Node 20 in CI or raise the engine requirement if Node 22 APIs are needed.

## Missing Critical Features

**Registry consistency for newer plugin categories:**
- Problem: Browser, editor, and AI-tool plugins are not obviously registered in `pluginRegistry`.
- Blocks: Generic plugin listing and install flows by category.
- Implementation complexity: Medium; needs API decision plus tests.

**End-to-end install safety on real fresh macOS machines:**
- Problem: Tests mock external tools; real machine permutations are large.
- Current workaround: Integration tests and dry-run paths cover some CLI behavior.
- Blocks: High confidence for installer changes without manual smoke testing.
- Implementation complexity: Medium to high, depending on CI/macOS availability.

## Test Coverage Gaps

**Config-first dry-run path:**
- What's not tested: Whether dry-run prevents both installation and writes across all config-first apply paths.
- Risk: A user invoking dry-run may still write dotfiles.
- Priority: Medium.

**First-party plugin registration:**
- What's not tested: Complete registry coverage for all plugin categories.
- Risk: New plugin modules exist but are invisible to registry consumers.
- Priority: Medium.

**Release packaging smoke test:**
- What's not tested: Installed npm bin from packed artifact running basic commands.
- Risk: Build output or bin path regressions.
- Priority: Medium.

---

*Concerns audit: 2026-06-12*
*Update as issues are fixed or new ones discovered*
