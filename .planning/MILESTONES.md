# Milestones

## v1.0 Machine Inventory and Provenance (Shipped: 2026-06-21)

**Phases completed:** 5 phases, 15 plans, 32 tasks

**Key accomplishments:**

- Zod-validated browser and note-taking metadata catalogs with pure central lookup helpers
- Registry-backed BrowserStep and browser plugin catalog with mocked command-boundary regression tests
- Strict metadata validation, descendant path lookups, and concrete browser wizard regression gates
- Evidence-backed inventory scanner with Homebrew audit data, app-path checks, shell/core facts, warnings, and pure summary helpers
- Static Homebrew, vfox, and editor metadata rows are now validated through the shared registry for inventory consumption.
- Interactive wizard startup now scans inventory, falls back safely on scanner failure, and renders known installed tools before later setup choices.
- Homebrew installed-on-request data now classifies formulae as direct, dependency, or unknown across known tool evidence and unmatched audit data.
- Config-first and wizard confirmation paths now show concise installed-tool, Homebrew count, and warning summaries before setup/apply decisions.
- Startup inventory now has explicit loading, ready, and failed states that gate wizard setup and config-first apply choices without turning installed facts into package defaults.
- Homebrew metadata fact now reports installed command evidence when mocked Homebrew helpers prove brew availability
- Read-only dotfile path discovery map with metadata-backed known-tool matching and concise inventory counts
- Safe shell rc parsing with known hook evidence, unknown finding counts, and shared concise inventory output
- Evidence-backed provenance derivation with config-aware tilde-managed precedence and concise grouped formatting
- Config-aware provenance summaries rendered through config-first and final wizard confirmation paths
- Source-aware tilde config discovery with fixed known paths and shared CLI no-config guidance

---
