# Phase 3: Dotfiles Discovery Map - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-18
**Phase:** 3-Dotfiles Discovery Map
**Areas discussed:** Map Shape, RC Parsing, Scan Scope, Output Surface

---

## Map Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Evidence-first records | Each finding records path, source scope, matched tool metadata, match confidence/reason, and raw-safe evidence. | |
| Tool-first grouping | Group findings under each known tool, with unknown files in a separate bucket. | |
| Hybrid | Store evidence-first records internally, plus derived tool-grouped summaries for display. | ✓ |

**User's choice:** Hybrid.
**Notes:** The user selected canonical evidence records plus derived grouped summaries so Phase 4 can consume precise evidence while users see concise terminal output.

### Ambiguous Matches

| Option | Description | Selected |
|--------|-------------|----------|
| Classify per finding | One file can produce multiple findings such as known tool hook, PATH edit, and unknown alias. | |
| Classify per file by strongest match | Mark the whole file as known if any known tool is found, with secondary notes. | |
| Known file plus nested findings | File-level summary says mixed known/unknown, then nested findings carry exact classification. | ✓ |

**User's choice:** Known file plus nested findings.
**Notes:** Mixed files should stay readable at the file level while preserving exact known, unknown, and ambiguous findings underneath.

---

## RC Parsing

| Option | Description | Selected |
|--------|-------------|----------|
| Core shell setup only | Parse aliases/functions names, exported variable names, PATH edits, source statements, and known tool init hooks. | ✓ |
| Broad shell inventory | Include function bodies, conditionals, plugin manager blocks, and command substitutions. | |
| Known-tool oriented | Parse only metadata or known tool patterns, plus unknown line-count summaries. | |

**User's choice:** Core shell setup only.
**Notes:** Phase 3 should satisfy rc-file discovery without becoming a shell interpreter.

### Environment Variable Values

| Option | Description | Selected |
|--------|-------------|----------|
| Names only by default | Record variable names and whether values are literal/reference/command-derived, but do not persist raw values. | ✓ |
| Safe literals allowed | Persist simple non-secret literals after secret-pattern filtering; redact suspicious values. | |
| No env var details | Only count exported variables and flag known tool-related names. | |

**User's choice:** Names only by default.
**Notes:** This keeps rc parsing aligned with the project security rule against persisting raw secrets.

---

## Scan Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Home + metadata paths | Scan known shell rc files in `$HOME` and metadata-declared config/dotfile paths. | |
| Home + metadata + configured workspace roots | Also scan configured context/workspace roots for known config filenames. | |
| Home + metadata + dotfiles repo | Also scan the configured `dotfilesRepo`. | |
| Combined bounded scan | Scan home rc files, metadata-declared paths, configured `dotfilesRepo`, and shallow known config names under configured workspace roots. | ✓ |

**User's choice:** Combined bounded scan.
**Notes:** Scope should satisfy DOT-03 while remaining deterministic and read-only.

### Workspace Bounds

| Option | Description | Selected |
|--------|-------------|----------|
| Root-level known files only | Check only known filenames at the workspace root. | |
| Shallow allowlisted directories | Check root plus selected directories like `.config/`, `.vscode/`, `.github/`, and tool-specific metadata paths, with a low max depth. | ✓ |
| Respect ignore files and scan shallow tree | Walk a shallow tree while applying `.gitignore`/ignore rules. | |

**User's choice:** Shallow allowlisted directories.
**Notes:** Workspace scans should avoid broad traversal and stay easy to reason about in tests.

---

## Output Surface

| Option | Description | Selected |
|--------|-------------|----------|
| Structured data only | Build the dotfile map and tests; user-facing summaries wait for Phase 4 provenance. | |
| Concise summary in inventory step | Add a small "Dotfiles found" summary alongside current inventory output, while keeping detailed audit data internal. | ✓ |
| Dedicated detail command/output | Add a specific CLI path or verbose output for dotfile findings. | |

**User's choice:** Concise summary in inventory step.
**Notes:** Phase 3 should expose small summary lines now, not a new detailed command.

---

## the agent's Discretion

- Exact type names and module placement.
- Exact conservative filename and directory allowlists for workspace scanning.
- Exact terminal summary wording, as long as it is concise and shared between wizard and config-first surfaces.

## Deferred Ideas

- Final provenance labels remain Phase 4.
- Dedicated detailed dotfile inspection command or verbose output mode is deferred.
- Broad recursive workspace crawling and full shell interpretation are out of scope.
