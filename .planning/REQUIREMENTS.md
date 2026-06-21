# Requirements: tilde Searchable Tool and Config Ecosystem

**Defined:** 2026-06-21
**Core Value:** tilde should explain a machine's developer setup clearly enough that users can trust what it will manage before it changes anything.

## v1.1 Requirements

### Stabilization

- [x] **STAB-01**: Generated JavaScript output does not incorrectly copy or expose `.tsx` source content. GitHub: #52.
- [x] **STAB-02**: Plugin ownership labels such as `first-party` come from explicit, explainable metadata. GitHub: #60.
- [x] **STAB-03**: Interactive config-required flows prompt or clearly explain when an existing discovered config will be used because `--config` was not specified. GitHub: #74.

### Schema and Config Evolution

- [x] **SCHEMA-01**: `tilde.config.json` has a standardized versioning and migration pattern. GitHub: #54.
- [ ] **SCHEMA-02**: Shared generated schema metadata powers both CLI schema output and the docs-site schema explorer so config docs do not drift from runtime behavior. GitHub: #83.
- [ ] **SCHEMA-03**: tilde exposes a schema viewer so users and maintainers can inspect effective schema structure. GitHub: #83.

### Search Wrapper API

- [ ] **WRAP-01**: tilde provides a typed search interface for package, extension, plugin, defaults, and dotfile ecosystems. GitHub: #105.
- [ ] **WRAP-02**: Search providers can report actionable result identity, ecosystem source, install/config target, and confidence. GitHub: #105, #31.
- [ ] **WRAP-03**: Search provider failures are non-fatal diagnostics and all external commands are mocked in tests. GitHub: #105.

### Ecosystem Search UX

- [ ] **SEARCH-01**: tilde can search Homebrew formulae and display actionable results. GitHub: #70.
- [ ] **SEARCH-02**: tilde can search macOS defaults metadata without writing defaults. GitHub: #56.
- [ ] **SEARCH-03**: tilde can search registered plugins/resources using shared registry metadata. GitHub: #84.

## Future Requirements

### Additional Wizard Steps

- **STEP-01**: Add terminal emulator wizard step. GitHub: #96.
- **STEP-02**: Add productivity apps wizard step. GitHub: #97.
- **STEP-03**: Add note-taking apps wizard step. GitHub: #82.
- **STEP-04**: Add zsh plugin support. GitHub: #101.
- **STEP-05**: Add expanded browser capabilities. GitHub: #108, #109.
- **STEP-06**: Add Obsidian iCloud Drive symlink sync. GitHub: #110.

### Distribution and Release Channels

- **DIST-01**: Publish or maintain Homebrew formula. GitHub: #3.
- **DIST-02**: Clean up bootstrap Node.js after first-run setup. GitHub: #2.
- **DIST-03**: Verify pnpm and yarn global install support. GitHub: #5.
- **DIST-04**: Add canary releases. GitHub: #62.

### Platform and Backend Expansion

- **PLAT-01**: Support OS-specific config files beyond v1.1 schema groundwork. GitHub: #107.
- **PLAT-02**: Add Windows support. GitHub: #7.
- **PLAT-03**: Add Nix and MacPorts package manager support. GitHub: #55.
- **SEC-01**: Add Bitwarden and macOS Keychain secrets backends. GitHub: #8.

## Out of Scope

| Feature | Reason |
|---------|--------|
| New wizard step families in v1.1 | Search and schema foundations should land before broadening setup choices. |
| Install-channel/distribution work in v1.1 | Separate release engineering milestone; not core to searchable resource management. |
| First-class Windows support in v1.1 | Current product remains macOS-first; wrapper/search abstractions should not force cross-platform behavior yet. |
| Secret resolution in search results | Security constraint: do not resolve or persist raw secrets. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| STAB-01 | Phase 6 | Complete |
| STAB-02 | Phase 6 | Complete |
| STAB-03 | Phase 6 | Complete |
| SCHEMA-01 | Phase 7 | Complete |
| SCHEMA-02 | Phase 7 | Pending |
| SCHEMA-03 | Phase 7 | Pending |
| WRAP-01 | Phase 8 | Pending |
| WRAP-02 | Phase 8 | Pending |
| WRAP-03 | Phase 8 | Pending |
| SEARCH-01 | Phase 9 | Pending |
| SEARCH-02 | Phase 9 | Pending |
| SEARCH-03 | Phase 9 | Pending |

**Coverage:**

- v1.1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-06-21*
*Last updated: 2026-06-21 after Phase 6 completion*
