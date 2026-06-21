# Phase 07: Config and Schema Versioning Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-21
**Phase:** 07-config-and-schema-versioning-foundation
**Areas discussed:** Config version policy, compatibility behavior, repos.json scope, CLI schema viewer, website schema explorer

---

## Config Version Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Monotonic integers | Use simple string integers like `"2"`, `"3"` for schema generations; avoids parseFloat/version-order bugs. | |
| Semver strings | Use strings like `"1.7.0"` when schema changes track product releases more visibly. | ✓ |
| Keep decimals | Continue the current `"1.6"`, `"1.7"` pattern and just tighten comparison logic. | |

**User's choice:** Semver strings.
**Notes:** User asked whether JSON schema patches are useful and wanted to keep changes mostly additive while preserving the option for a future `2.0`. Follow-up decision: use major.minor only; additive v1 changes increment minor version, while patches stay package-level and do not appear in config `schemaVersion`.

| Option | Description | Selected |
|--------|-------------|----------|
| No patches in config | Only use major.minor for schemaVersion; patches stay package-only unless the schema shape changes. | ✓ |
| Validation fixes only | Allow patch bumps for non-shape schema fixes, such as stricter messages or bug-compatible validation corrections. | |
| Any code fix | Mirror package semver more closely, including patch schemaVersion bumps for implementation-only migration fixes. | |

**User's choice:** No patches in config.
**Notes:** Config format versions should be major.minor only.

| Option | Description | Selected |
|--------|-------------|----------|
| Rewrite on load | Keep current behavior: successful migrations atomically update the file so future runs see the new version. | ✓ |
| Ask first | Interactive flows confirm before rewriting; non-interactive flows need a flag or warning path. | |
| In memory only | Use migrated config for the current run but leave files unchanged unless the user runs an explicit command. | |

**User's choice:** Rewrite on load.
**Notes:** Successful migrations should preserve current atomic rewrite behavior.

| Option | Description | Selected |
|--------|-------------|----------|
| Keep but clarify | Leave `version: "1"` for config document family and make schemaVersion the real evolution mechanism. | |
| Deprecate it | Stop emphasizing `version` and plan eventual removal; schemaVersion becomes the only meaningful version field. | ✓ |
| Unify them | Make `version` carry the same major as schemaVersion, which is cleaner but changes established config shape. | |

**User's choice:** Deprecate it.
**Notes:** The top-level `version` field should no longer be treated as meaningful config evolution state.

---

## Compatibility Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only validate | Warn clearly, parse enough to show/inspect, but do not rewrite or apply machine changes. | |
| Hard fail | Refuse to load the config until tilde is upgraded, even for inspection paths. | |
| Best effort apply | Warn but continue applying known fields, risking partial interpretation of future config. | |
| Soft block | Allow inspect/help paths, block apply/rewrite/migration, and guide the user to upgrade tilde when ready. | ✓ |

**User's choice:** Soft block.
**Notes:** User wanted best-practice behavior that avoids backward-compatibility pain and lets users upgrade when ready, while not letting older tilde overwrite a newer schema.

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve unknowns | Do not discard unknown fields during migrations/writes where feasible; protects additive v1 fields. | |
| Validate known only | Accept unknown fields during load, but writes may omit fields tilde does not model. | |
| Reject unknowns | Keep the config strict so unsupported fields fail validation immediately. | |
| Warn and strip | Continue and report unknowns, but written configs only contain fields tilde officially models. | ✓ |

**User's choice:** Warn and strip.
**Notes:** User reasoned that a manually edited config with unsupported fields is probably user error, not future compatibility, and leaned toward warning and stripping.

| Option | Description | Selected |
|--------|-------------|----------|
| Allow legacy migration | Better backward compatibility: no schemaVersion means legacy v1, migrate and rewrite. | |
| Invalid config | Better strictness: missing schemaVersion is user-repairable invalid config. | ✓ |
| Grace period | Auto-migrate now, but document that a future major version may require schemaVersion. | |

**User's choice:** Invalid config.
**Notes:** User clarified there are no real legacy users yet because tilde is still creating the base CLI tool, so missing `schemaVersion` should be invalid.

---

## repos.json Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Version foundation only | Define/read/validate its schemaVersion shape without building repository management behavior yet. | |
| Repository registry | Model tracked repos enough for future search/resource flows to consume it. | |
| User config peer | Treat repos.json like a second user-authored config file with docs, validation, and CLI inspect support. | |
| Remove as stray | Treat #81/repos.json as out of scope for tilde and capture a roadmap cleanup decision. | ✓ |

**User's choice:** Remove as stray.
**Notes:** User suspected `repos.json` belonged to `github-repo-factory`. A GitHub check confirmed #81 does not resolve in this repo, while #54 and #83 do. Phase 07 should remove `repos.json` from roadmap/requirements.

---

## CLI Schema Viewer

| Option | Description | Selected |
|--------|-------------|----------|
| Maintainers | A CLI inspection tool for contributors to understand fields, defaults, validation, and version state. | |
| End users | A friendly command users can run to understand how to write or edit `tilde.config.json`. | |
| Both equally | Support maintainer-level structure and user-friendly explanations from the start. | ✓ |

**User's choice:** Both equally.
**Notes:** Schema viewer should be useful for maintainers and end users.

| Option | Description | Selected |
|--------|-------------|----------|
| Readable tree | Show a terminal-friendly field tree with types, required/default markers, and short descriptions. | ✓ |
| Raw JSON Schema | Print machine-readable JSON schema by default for tooling and editor integration. | |
| Summary table | Show compact grouped tables by config section, optimized for scanning rather than nesting. | |

**User's choice:** Readable tree.
**Notes:** Default output should be human-readable.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, --json | Default is readable tree, with `--json` for generated schema/tooling consumers. | ✓ |
| No, human only | Keep Phase 07 narrow and defer machine-readable output until another phase. | |
| JSON default | Machine-readable output is primary; users can request a readable view separately. | |

**User's choice:** Yes, `--json`.
**Notes:** Machine-readable output should exist as an explicit mode.

| Option | Description | Selected |
|--------|-------------|----------|
| tilde config schema | Fits existing config subcommands and keeps schema inspection under the config namespace. | ✓ |
| tilde schema | Shorter top-level command if schema inspection may later cover many resource types. | |
| tilde config inspect | Frames it as exploration rather than schema export, but less explicit. | |

**User's choice:** `tilde config schema`.
**Notes:** Downstream planning should assume this command shape.

---

## Website Schema Explorer

| Option | Description | Selected |
|--------|-------------|----------|
| Defer to next phase | Keep Phase 07 CLI-focused and create a future docs/site explorer phase. | |
| CLI prepares it only | Do not build the page now; ensure `--json` output can power it later. | |
| Widen Phase 07 | Include it in context and flag that ROADMAP/requirements should be updated before planning. | ✓ |

**User's choice:** Widen Phase 07.
**Notes:** User explicitly requested including a more interactive schema exploration page in the tilde website as part of Phase 07.

| Option | Description | Selected |
|--------|-------------|----------|
| Interactive field browser | Browsable schema tree with field details, required/default markers, search/filter, and examples where available. | ✓ |
| Enhanced docs page | Mostly static config reference with collapsible sections, less custom interactivity. | |
| Full playground | Let users paste config JSON and validate/explore it in-browser, which is larger and riskier. | |

**User's choice:** Interactive field browser.
**Notes:** Phase 07 should not build a full browser-based config validator/playground.

| Option | Description | Selected |
|--------|-------------|----------|
| Shared generated metadata | One schema metadata artifact feeds CLI tree, `--json`, and the website explorer to prevent docs drift. | ✓ |
| Site-local data | Keep the website explorer data separate in the docs site for faster frontend work. | |
| Raw Zod introspection | Both surfaces derive directly from Zod at runtime/build time, with less explicit metadata. | |

**User's choice:** Shared generated metadata.
**Notes:** The current docs have schema drift, so shared generated metadata is preferred.

| Option | Description | Selected |
|--------|-------------|----------|
| Config section page | Add a dedicated schema explorer page near Configuration Reference/Format in the Starlight sidebar. | ✓ |
| Embed in reference | Put the explorer inside the existing Configuration Reference page. | |
| Top-level tool page | Make it a separate prominent docs tool outside the config reference flow. | |

**User's choice:** Config section page.
**Notes:** Add a dedicated schema explorer page in the docs config section/sidebar.

| Option | Description | Selected |
|--------|-------------|----------|
| Search + details | Search fields, expand/collapse groups, and show type/default/required/version notes. | ✓ |
| Search only | Keep it lightweight: searchable list/tree with minimal details. | |
| Examples too | Include search/details plus generated per-field example snippets where practical. | |

**User's choice:** Search + details.
**Notes:** Examples may be included if practical, but they are not required for Phase 07.

---

## the agent's Discretion

- Planner may choose the internal shared schema metadata format.
- Planner may choose exact user-facing warning wording for compatibility diagnostics.
- Planner may decide exact implementation structure for the Astro/Starlight explorer.

## Deferred Ideas

None. The website schema explorer was folded into Phase 07, and `repos.json` was removed as stray scope rather than deferred.
