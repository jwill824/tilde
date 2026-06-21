# Phase 3: Dotfiles Discovery Map - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase creates a read-only dotfile discovery map that connects known dotfile paths, tool config paths, shell rc-file contents, workspace config files, and unknown files to structured evidence. It should build on the shared metadata registry and Phase 2 inventory report without assigning final provenance labels. The output should give Phase 4 enough evidence to explain tool provenance while giving users a concise terminal summary of discovered dotfile/config state.

</domain>

<decisions>
## Implementation Decisions

### Dotfile Map Shape
- **D-01:** Use a hybrid map shape: canonical evidence-first findings internally, plus derived tool-grouped summaries for display and downstream summary rendering.
- **D-02:** Evidence records should preserve path, scan scope, matched metadata/tool id when available, match reason or confidence, finding type, and safe evidence details.
- **D-03:** A single file can contain mixed findings. File-level summaries should support a mixed known/unknown state, while nested findings carry exact known, unknown, or ambiguous classification.
- **D-04:** Unknown files and unknown rc-file findings should be reported separately from known tool-owned findings and should not be treated as errors.

### Shell RC Parsing
- **D-05:** Parse only core shell setup constructs in this phase: aliases/function names, exported variable names, PATH edits, `source`/`.` statements, and known tool init hooks.
- **D-06:** Do not attempt deep shell interpretation, arbitrary script execution modeling, broad function-body parsing, or full conditional/control-flow analysis in Phase 3.
- **D-07:** Environment variables discovered in rc files should record names and value kinds only, such as literal, reference, or command-derived. Raw values must not be persisted by default.
- **D-08:** Secret-looking or sensitive values remain out of planning artifacts and scanner output. This preserves the project security rule that secrets stay as backend references and are not resolved or persisted.

### Scan Scope
- **D-09:** Use a combined bounded read-only scan: home shell rc files, metadata-declared `configPaths` and `dotfilePaths`, the configured `dotfilesRepo`, and shallow known config locations under configured workspace roots.
- **D-10:** Workspace scanning should be limited to root-level known files plus shallow allowlisted directories such as `.config/`, `.vscode/`, `.github/`, and tool-specific metadata paths.
- **D-11:** Workspace traversal must remain deterministic through explicit allowlists, low maximum depth, and safe failure behavior. Do not introduce broad recursive filesystem crawling.
- **D-12:** Missing paths, unreadable files, and parse failures should produce structured warnings or skipped findings rather than blocking the inventory or wizard flows.

### Output Surface
- **D-13:** Phase 3 should expose a concise dotfile discovery summary in the existing inventory step rather than adding a new detailed command.
- **D-14:** Default terminal output should stay small: counts or short grouped lines for known mapped files, unknown files/findings, and warnings. Detailed audit data should remain available in structured report data for later phases.
- **D-15:** The summary should reuse the established `summarizeInventory`/inventory-step pattern where practical so wizard and config-first output do not drift.

### the agent's Discretion
- The exact TypeScript type names and module boundaries are planner/executor discretion, but new code should make the dotfile mapping boundary obvious and should fit naturally under the inventory or scanner architecture.
- The exact allowlist of workspace filenames and shallow directories is discretionary, as long as it is conservative, metadata-driven where possible, and covered by tests.
- The exact summary wording is discretionary, as long as it remains concise and terminal-scannable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Scope
- `.planning/PROJECT.md` — Defines the milestone sequence, core value, macOS-first constraint, non-destructive scan rule, and Phase 3 active requirement.
- `.planning/REQUIREMENTS.md` — Defines Phase 3 requirements `DOT-01` through `DOT-04`.
- `.planning/ROADMAP.md` — Defines Phase 3 goal, success criteria, and planned slices `03-01` and `03-02`.
- `.planning/STATE.md` — Records accumulated decisions and project concerns, including not deepening registry inconsistency.
- `.planning/phases/01-tool-metadata-registry/01-CONTEXT.md` — Locks metadata registry lookup and validation decisions Phase 3 must use.
- `.planning/phases/02-machine-inventory-scanner/02-CONTEXT.md` — Locks inventory fact shape, evidence-first scanning, startup integration, and concise inventory summary behavior Phase 3 must extend.

### Codebase Maps
- `.planning/codebase/STACK.md` — Confirms Node.js, TypeScript, Ink, Vitest, and external command mocking constraints.
- `.planning/codebase/ARCHITECTURE.md` — Describes startup flow, wizard mode layering, config-first flow, and dotfile writer boundaries.
- `.planning/codebase/INTEGRATIONS.md` — Describes local file storage, external integrations, and mocked command patterns.

### Existing Code
- `src/tools/metadata.ts` — Defines `configPaths` and `dotfilePaths` metadata fields used for known path matching.
- `src/tools/registry.ts` — Provides lookup helpers for config path and dotfile path matching.
- `src/inventory/report.ts` — Defines the Phase 2 inventory report shape and environment snapshot to extend or compose with dotfile mapping data.
- `src/inventory/scan.ts` — Existing inventory scan orchestration where dotfile discovery may integrate.
- `src/inventory/summary.ts` — Existing concise summary formatting used by wizard and config-first output.
- `src/steps/inventory.tsx` — Existing inventory wizard surface where the concise dotfile summary should appear.
- `src/modes/config-first.tsx` — Config-first surface that should receive the same concise inventory/dotfile summary.
- `src/capture/scanner.ts` — Existing scan helpers for dotfiles and rc files that can inform Phase 3, even if not preserved as the long-term boundary.
- `tests/unit/capture-scanner.test.ts` — Existing rc-file and dotfile scan test patterns to adapt or replace.
- `tests/unit/tool-metadata.test.ts` — Existing metadata lookup tests covering config and dotfile path matching.
- `tests/integration/wizard-flow.test.tsx` — Existing inventory-step summary tests to extend for concise dotfile output.
- `tests/integration/config-first.test.ts` — Existing config-first inventory summary tests to extend for concise dotfile output.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/tools/registry.ts`: Already matches exact and child config/dotfile paths from shared metadata.
- `src/tools/metadata.ts`: Already validates optional `configPaths` and `dotfilePaths`.
- `src/inventory/report.ts`: Already has evidence-backed facts, warnings, and an environment snapshot containing rc-file content.
- `src/inventory/summary.ts`: Already centralizes terminal summary lines for wizard and config-first use.
- `src/capture/scanner.ts`: Already scans home dotfiles and reads a limited rc-file set, useful as a migration source.

### Established Patterns
- Scanners should fail softly and return warnings instead of crashing user flows.
- External command behavior is mocked in tests; filesystem scanning should similarly be testable with temporary directories and fixture files.
- Wizard and config-first output should share summary formatting helpers rather than duplicating text.
- Phase 2 keeps installed evidence separate from final provenance labels; Phase 3 should do the same for dotfile evidence.

### Integration Points
- Dotfile mapping should consume shared metadata lookup helpers for known config and dotfile paths.
- Inventory startup can carry dotfile map data forward so wizard and config-first flows have it before user decisions.
- The inventory summary helper is the right place to add concise dotfile discovery lines so UI surfaces stay aligned.
- The detailed map should remain structured data for Phase 4 provenance rather than becoming a large default terminal dump.

</code_context>

<specifics>
## Specific Ideas

- Represent files as summaries with nested findings so mixed files like `.zshrc` can show both known tool hooks and unknown aliases without losing precision.
- Record env var names and value kinds only; do not persist raw values from rc files.
- Use a conservative workspace allowlist: root-level known config files plus shallow `.config/`, `.vscode/`, `.github/`, and tool-specific metadata paths.
- Keep the initial summary to counts or short grouped lines such as known mapped files, unknown findings, and warnings.

</specifics>

<deferred>
## Deferred Ideas

- Final provenance categories such as tilde-managed, manually installed, dependency, OS-provided, app-store/manual GUI install, and unknown remain Phase 4 work.
- A dedicated detailed dotfile inspection command or verbose output mode is out of scope for Phase 3 unless already required by the planner for testability.
- Broad recursive workspace crawling, full shell interpretation, and ecosystem-wide search remain out of scope.

</deferred>

---

*Phase: 3-Dotfiles Discovery Map*
*Context gathered: 2026-06-18*
