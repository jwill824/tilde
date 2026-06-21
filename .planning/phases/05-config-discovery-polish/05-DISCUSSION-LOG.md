# Phase 5: Config Discovery Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-20
**Phase:** 5-config-discovery-polish
**Areas discussed:** Discovery locations, Not-found guidance, Override behavior, Config command/subcommand consistency

---

## Discovery Locations

| Option | Description | Selected |
|--------|-------------|----------|
| Conservative known paths | Search current cwd, git root, `~/.tilde/tilde.config.json`, plus a short fixed legacy list like `~/.config/tilde/tilde.config.json` and `~/tilde.config.json`. | yes |
| Dotfiles-aware paths | Search the current paths plus known safe dotfiles locations, such as a configured or conventional dotfiles repo path containing `tilde.config.json`. | |
| Metadata-driven only | Keep auto-discovery tied to explicit tilde-owned paths and shared metadata, avoiding legacy home/config guesses. | |
| Other | User-provided exact discovery locations. | |

**User's choice:** Conservative known paths.
**Notes:** User delegated exact ordering, invalid-file handling, and searched-path wording details to the planner, provided explicit overrides remain highest priority and behavior stays safe.

---

## Not-Found Guidance

| Option | Description | Selected |
|--------|-------------|----------|
| Run the wizard | Primary recommendation is `tilde` to create a config. | yes |
| Pass `--config` | Primary recommendation is specifying an existing config path. | |
| Show both equally | List wizard creation and explicit path usage equally. | |
| Agent decides | Planner picks based on command context. | |

**User's choice:** Run the wizard.
**Notes:** User also selected adding useful location examples, delegated labeled-path formatting to the planner, and chose command-specific guidance for install/update style commands.

---

## Override Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| No fallback | Explicit path means explicit failure; mention auto-discovery or wizard only as next steps where appropriate. | yes |
| Fallback with warning | Try auto-discovery after warning that the explicit path failed. | |
| Agent decides | Planner chooses while preserving CONF-03. | |

**User's choice:** No fallback.
**Notes:** User chose env-specific wording for missing `TILDE_CONFIG`, chose repair-focused errors for invalid explicit configs, and delegated whether skipped auto-discovery paths are displayed.

---

## Config Command/Subcommand Consistency

| Option | Description | Selected |
|--------|-------------|----------|
| Install/update/startup only | Focus only on paths named in Phase 5 success criteria. | |
| All config-loading subcommands | Also update `tilde config`, `tilde context`, `reconfigure`, and any path that loads config. | yes |
| Shared helper, selective rollout | Build shared helpers and apply to install/update/startup now, leaving other commands for later unless low-risk. | |
| Agent decides | Planner chooses based on risk in `src/index.tsx` and tests. | |

**User's choice:** All config-loading subcommands.
**Notes:** User specifically chose auto-discovery for `tilde config validate/show/edit`, same discovery and override behavior for context commands, same not-found guidance for `--reconfigure`, and targeted CLI regression tests for all updated surfaces.

---

## the agent's Discretion

- Exact ordering of added legacy locations.
- Whether invalid auto-discovered files are skipped or selected and reported by `loadConfig()`.
- Whether searched paths are labeled in not-found messages.
- Whether explicit override failures list skipped auto-discovery paths.

## Deferred Ideas

None.
