# Requirements: tilde Machine Inventory and Provenance

**Defined:** 2026-06-12
**Core Value:** tilde should explain a machine's developer setup clearly enough that users can trust what it will manage before it changes anything.

## v1 Requirements

### Metadata Registry

- [x] **META-01**: Developer can define tool metadata in one shared location instead of duplicating step-specific maps.
- [x] **META-02**: Tool metadata can describe install method, package identifiers, plugin category, display label, supported platforms, config paths, and dotfile locations.
- [ ] **META-03**: Existing wizard steps can read metadata from the shared registry without changing their visible behavior.
- [x] **META-04**: Registry lookups can answer cross-step questions such as "which tools have dotfiles under ~/.config?".
- [x] **META-05**: Tests protect metadata loading, validation, and at least one existing step migration.

### Machine Inventory

- [ ] **INV-01**: tilde can detect already-installed package managers, version managers, shells, editors, and core tools before wizard interaction.
- [ ] **INV-02**: tilde can distinguish direct Homebrew installs from dependency installs using `brew list --installed-on-request`.
- [ ] **INV-03**: Wizard or summary output can pre-highlight tools that are already installed.
- [ ] **INV-04**: Inventory scans fail softly when an external command is missing, slow, or unavailable.

### Dotfiles Mapping

- [ ] **DOT-01**: tilde can map known dotfile paths to related tools using the shared metadata registry.
- [ ] **DOT-02**: tilde can parse common shell rc files for aliases, environment variables, plugin references, and PATH modifications.
- [ ] **DOT-03**: tilde can look for tool config files in home and workspace context locations without mutating them.
- [ ] **DOT-04**: Dotfile discovery output identifies unknown files separately from known tool-owned files.

### Provenance Summary

- [ ] **PROV-01**: tilde can label tools as tilde-managed, already installed, Homebrew dependency, manually installed, app-store/manual GUI install, OS-provided, or unknown.
- [ ] **PROV-02**: Wizard and/or config summary output shows provenance without overwhelming the user.
- [ ] **PROV-03**: Provenance can explain why tilde selected or skipped a tool.
- [ ] **PROV-04**: Provenance data is derived from scanner output and metadata rather than hardcoded per-step text.

### Config Discovery

- [ ] **CONF-01**: When no config is provided, tilde gives a helpful error that lists searched paths.
- [ ] **CONF-02**: tilde can discover configs in known dotfiles locations when safe and deterministic.
- [ ] **CONF-03**: `--config` and `TILDE_CONFIG` continue to override auto-discovery.

## v2 Requirements

### Ecosystem Search and Wrapper APIs

- **WRAP-01**: Provide a consistent search interface for package, extension, plugin, defaults, and dotfile ecosystems. GitHub: #105.
- **WRAP-02**: Support Homebrew formula search and macOS defaults search. GitHub: #70, #56.
- **WRAP-03**: Create plugin registry and search UX. GitHub: #84.

### Additional Wizard Steps

- **STEP-01**: Add terminal emulator wizard step. GitHub: #96.
- **STEP-02**: Add productivity apps wizard step. GitHub: #97.
- **STEP-03**: Add note-taking apps wizard step. GitHub: #82.
- **STEP-04**: Add zsh plugin support. GitHub: #101.
- **STEP-05**: Add expanded browser capabilities. GitHub: #108, #109.

### Platform Expansion

- **PLAT-01**: Support OS-specific config files. GitHub: #107.
- **PLAT-02**: Add Windows support. GitHub: #7.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full ecosystem wrapper/search API in v1 | Needs shared metadata and inventory first. |
| New wizard step families in v1 | The current milestone sequence is about making existing and future steps data-driven. |
| Cross-platform inventory in v1 | Current app enforces macOS for interactive flows. |
| Homebrew formula distribution | Separate install-channel work, not inventory/provenance. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| META-01 | Phase 1 | Complete |
| META-02 | Phase 1 | Complete |
| META-03 | Phase 1 | Pending |
| META-04 | Phase 1 | Complete |
| META-05 | Phase 1 | Complete |
| INV-01 | Phase 2 | Pending |
| INV-02 | Phase 2 | Pending |
| INV-03 | Phase 2 | Pending |
| INV-04 | Phase 2 | Pending |
| DOT-01 | Phase 3 | Pending |
| DOT-02 | Phase 3 | Pending |
| DOT-03 | Phase 3 | Pending |
| DOT-04 | Phase 3 | Pending |
| PROV-01 | Phase 4 | Pending |
| PROV-02 | Phase 4 | Pending |
| PROV-03 | Phase 4 | Pending |
| PROV-04 | Phase 4 | Pending |
| CONF-01 | Phase 5 | Pending |
| CONF-02 | Phase 5 | Pending |
| CONF-03 | Phase 5 | Pending |

**Coverage:**

- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-06-12*
*Last updated: 2026-06-12 after initial definition*
