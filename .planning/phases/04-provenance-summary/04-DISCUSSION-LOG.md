# Phase 04: Provenance Summary - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.
>
> **Retroactive note:** This log was reconstructed on 2026-06-21 from `04-CONTEXT.md`, `04-01-PLAN.md`, `04-02-PLAN.md`, and plan summaries after the original discussion log was found missing.

**Date:** 2026-06-19
**Phase:** 04-provenance-summary
**Areas discussed:** Provenance semantics, shared derivation, output behavior, deferred audit detail

---

## Provenance Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Config-selected primary label | Tools selected by the current config or wizard run should be labeled `tilde-managed`, with installed/manual/dependency evidence preserved as detail. | ✓ |
| Installation-source primary label | Already installed, dependency, manual, and OS evidence should take primary label precedence even when selected by tilde. | |
| Scanner-only provenance | Use scanner evidence without config intent to assign primary categories. | |

**User's choice:** Config-selected primary label.
**Notes:** Captured in `04-CONTEXT.md`: selected tools keep `tilde-managed` as the primary label; detail/action text explains installed, dependency, manual, or unknown evidence.

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve dependency evidence | Homebrew dependency remains explicit evidence and detail, including for selected tools. | ✓ |
| Collapse into installed | Treat dependency installs as generic already-installed tools. | |
| Promote to direct install | Convert dependency-installed selected tools into direct install intent. | |

**User's choice:** Preserve dependency evidence.
**Notes:** Selected dependency-installed tools read as selected and already present as a dependency; no install needed unless future logic promotes direct install.

---

## Shared Derivation

| Option | Description | Selected |
|--------|-------------|----------|
| Shared helper | Add a shared provenance helper separate from UI components, deriving labels and actions from config, metadata, and inventory evidence. | ✓ |
| UI-local logic | Let each UI surface derive its own provenance text. | |
| Scanner-owned labels | Push final provenance labels into inventory scanning. | |

**User's choice:** Shared helper.
**Notes:** Captured as `deriveInventoryProvenance(report, config?)`, `summarizeProvenanceGroups()`, and `formatProvenanceSummaryLine()` in Plan 04-01.

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve structured evidence | Keep detailed evidence in data structures for tests/future audit views while normal output stays concise. | ✓ |
| Text-only summaries | Emit only user-facing strings and drop detailed evidence from provenance results. | |
| Full audit UI now | Add a verbose evidence screen in Phase 04. | |

**User's choice:** Preserve structured evidence.
**Notes:** The verbose audit view was explicitly deferred.

---

## Output Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| One concise grouped line | Render one provenance summary line with grouped counts, up to three examples per group, and `+N more`. | ✓ |
| Verbose per-tool output | Show each tool and evidence item in normal setup output. | |
| No user-facing output yet | Keep provenance derivation internal until a later UI phase. | |

**User's choice:** One concise grouped line.
**Notes:** Config-first and final wizard confirmation use shared `summarizeInventory(report, config?)`; early wizard inventory stays evidence-oriented because final selections are not known yet.

| Option | Description | Selected |
|--------|-------------|----------|
| Action-oriented explanations | Explain install, skip-present, leave-unmanaged, dependency-present, and cautious unknown outcomes. | ✓ |
| Category names only | Show labels without action context. | |
| Block unknowns | Treat unknown selected tools as blockers. | |

**User's choice:** Action-oriented explanations.
**Notes:** Unknown selected tools do not block apply; warnings remain visible.

---

## the agent's Discretion

- Exact helper shape and tests were delegated to the planner/executor, constrained by the context decisions.
- Exact summary line wording was left flexible as long as it stayed concise and grouped.

## Deferred Ideas

- Verbose audit view for detailed provenance evidence — future phase.
