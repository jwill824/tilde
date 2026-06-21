# Phase 06: Stabilization and Config Selection Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.
>
> **Retroactive note:** This log was reconstructed on 2026-06-21 from `06-CONTEXT.md`, `06-01-PLAN.md`, and `06-01-SUMMARY.md` after the original discussion log was found missing.

**Date:** 2026-06-21
**Phase:** 06-stabilization-and-config-selection-polish
**Areas discussed:** Generated JS output, plugin ownership labels, discovered config prompts

---

## Generated JS Output

| Option | Description | Selected |
|--------|-------------|----------|
| Reproduce first | Begin by reproducing and pinning the generated JS/package output issue before changing build behavior. | ✓ |
| Reconfigure build immediately | Change TypeScript/package config based on the issue title without a failing check. | |
| Defer build cleanup | Leave artifact behavior for a future packaging phase. | |

**User's choice:** Reproduce first.
**Notes:** `06-CONTEXT.md` recorded the issue as underspecified and required a failing test or scripted check before changing build behavior.

---

## Plugin Ownership Labels

| Option | Description | Selected |
|--------|-------------|----------|
| Explain first-party ownership | Keep machine-readable plugin source values, but make user-facing output explain built-in ownership. | ✓ |
| Redesign plugin registry | Widen registry semantics across browser/editor/AI metadata now. | |
| Leave source label as-is | Keep output like `homebrew  1.0.0  first-party` without clarification. | |

**User's choice:** Explain first-party ownership.
**Notes:** Phase 06 fixed user-facing output as `first-party (built in)` while preserving machine-readable source values in code.

---

## Discovered Config Prompts

| Option | Description | Selected |
|--------|-------------|----------|
| Prompt/explain discovered configs | Interactive startup/config-first flows confirm or explain auto-discovered config use when no explicit source was provided. | ✓ |
| Prompt every config source | Ask even when `--config`, `TILDE_CONFIG`, or positional paths are explicit. | |
| Never prompt | Keep discovered config use implicit. | |

**User's choice:** Prompt/explain discovered configs.
**Notes:** Explicit config sources bypass the prompt. Non-interactive config-required commands remain deterministic.

---

## the agent's Discretion

- Exact artifact check shape was left to the planner, as long as it was deterministic and user-facing.
- Exact plugin-list formatting was left flexible, constrained by explainability and compatibility.
- Exact layer for discovered-config confirmation was left to implementation, constrained by preserving non-interactive behavior.

## Deferred Ideas

- Broader schema versioning moved to Phase 07.
- Search wrapper and broader registry/search UX moved to Phase 08/09.
- Build cleanup remains intentionally narrow; future packaging overhaul may replace it.
