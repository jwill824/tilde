# Implementation Plan: Wizard UX & CLI Interaction Improvements

**Branch**: `008-wizard-ux-enhancements` | **Date**: 2026-04-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-wizard-ux-enhancements/spec.md`
**Issues**: #49 (P1), #51 (P1), #50 (P1), #59 (P2), #47 (P2), #11 (P3), #9 (P3), #27 (P3), #53 (P4)

## Summary

Seven coordinated improvements to the tilde wizard and CLI spanning three layers: (1) wizard navigation — back/skip support and a context list view; (2) CLI hardening — config-required error behavior, auto-discovery, and a new `tilde update <resource>` interactive mini-wizard command; (3) new wizard steps — browser selection (step 14), expanded editor choices (step 10 extended), AI coding assistant tools (step 15), and per-context language version bindings (step 07 extended). All new steps follow the existing Ink + plugin architecture and are optional/skippable.

## Technical Context

**Language/Version**: TypeScript 5.4, Node.js ≥ 20 (ESM-only, NodeNext module resolution)
**Primary Dependencies**: Ink 6, React 19, ink-select-input 6, ink-text-input 6, ink-spinner 5, Zod 4, execa 9
**Storage**: `tilde.config.json` (file-based); config schema versioned with `schemaVersion` field
**Testing**: Vitest 4 — unit (`vitest.config.ts`), integration (`vitest.integration.config.ts`), contract (`vitest.contract.config.ts`)
**Target Platform**: macOS (arm64 / x64)
**Project Type**: Interactive CLI tool
**Performance Goals**: Language version switching on context activation ≤ 5 seconds; `tilde update` resource flow ≤ 60 seconds end-to-end
**Constraints**: ESM-only; all UI must use Ink; no silent state mutations; all new steps must be skippable
**Scale/Scope**: ~18 source files changed or created; 2 new wizard steps; 1 new CLI mode; config schema minor version bump

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Configuration-First** | ✅ PASS | All new wizard steps present choices with no pre-selected defaults; browser, editor, and AI tool steps require explicit user confirmation |
| **II. Bootstrap-Ready** | ✅ PASS | New steps are additive to the existing wizard flow; `bootstrap.sh` and install path unchanged |
| **III. Context-Aware Environments** | ✅ PASS | Language bindings per context directly fulfil this principle; version manager drives activation via shell hook |
| **IV. Interactive & Ink-First UX** | ✅ PASS | Back navigation, context list view, and `tilde update` mini-wizard all built with Ink; no silent mutations |
| **V. Idempotent Operations** | ✅ PASS | Browser/editor/AI tool install steps must check current state before installing; language binding activation must be idempotent |
| **VI. Secrets-Free Repository** | ✅ PASS | No credential handling introduced; AI tool sign-in is deferred to the tool itself |
| **VII. macOS First** | ✅ PASS | Browser default-setting uses macOS-only mechanism (`defaultbrowser` CLI); platform guard unchanged |
| **VIII. Extensibility & Plugin Architecture** | ⚠️ REQUIRES ATTENTION | Browser detection/install and AI tools must follow plugin pattern (Principle VIII). Browser step → `BrowserPlugin` interface; editor configs beyond VS Code → extend `EditorPlugin` interface; AI tools → queried from Homebrew at runtime, not hardcoded |

**Gate result**: PASS with one architectural requirement — browser and editor plugins must implement the existing plugin API contract before new wizard steps can invoke them.

**Post-Phase-1 re-check**: Plugin interfaces defined in `contracts/cli-schema.md` confirm compliance. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/008-wizard-ux-enhancements/
├── plan.md              ← this file
├── research.md          ← Phase 0 complete
├── data-model.md        ← Phase 1 complete
├── quickstart.md        ← Phase 1 complete
├── contracts/
│   └── cli-schema.md    ← Phase 1 complete
└── tasks.md             ← Phase 2 (via /speckit.tasks — not yet created)
```

### Source Code (repository root)

```text
src/
├── index.tsx                         ← CHANGED — add `update` subcommand routing
├── modes/
│   ├── wizard.tsx                    ← CHANGED — add step history stack, back/skip navigation, optional-step metadata
│   ├── reconfigure.tsx               ← CHANGED — ReconfigureMode: load existing config, pre-populate wizard, atomic overwrite on complete
│   ├── config-first.tsx              ← CHANGED — add config auto-discovery logic
│   └── update.tsx                    ← NEW — tilde update <resource> interactive mini-wizard
├── steps/
│   ├── 07-contexts.tsx               ← CHANGED — context list view, back-nav preservation, language binding UI
│   ├── 10-app-config.tsx             ← CHANGED — expand editor choices beyond VS Code
│   ├── 14-browser.tsx                ← NEW — browser selection & default-setting step
│   └── 15-ai-tools.tsx               ← NEW — AI coding assistant tools step
├── ui/
│   └── step-nav.tsx                  ← NEW — shared StepNav component (Back/Skip controls with keyboard shortcuts 'b'/'s')
├── plugins/
│   ├── api.ts                        ← CHANGED — add BrowserPlugin and EditorPlugin interfaces
│   └── first-party/
│       ├── browser/
│       │   └── index.ts              ← NEW — BrowserPlugin implementation (macOS)
│       └── vscode/                   ← (rename/refactor from dotfiles/vscode.ts)
│           └── index.ts              ← CHANGED — implement EditorPlugin interface
├── config/
│   └── schema.ts                     ← CHANGED — add browser, aiTools, languageBindings fields; bump schemaVersion
├── dotfiles/
│   ├── cd-hook.ts                    ← CHANGED — apply language version bindings on context activation
│   └── vscode.ts                     ← CHANGED or absorbed into plugins/first-party/vscode/
└── utils/
    └── package-manager.ts            ← NEW — Homebrew query helpers (list installed, search casks/formulae)

tests/
├── unit/
│   ├── wizard-navigation.test.ts     ← NEW — back/skip/history state machine
│   ├── config-discovery.test.ts      ← NEW — auto-discovery logic
│   ├── update-command.test.ts        ← NEW — tilde update routing & validation
│   ├── browser-step.test.ts          ← NEW — browser detection & install
│   └── language-binding.test.ts      ← NEW — context activation + version switching
├── integration/
│   └── wizard-flow.test.ts           ← CHANGED — add back-nav and new steps to flow tests
└── contract/
    └── config-schema.test.ts         ← CHANGED — validate new schema fields
```

## Complexity Tracking

> No constitution violations requiring justification.

