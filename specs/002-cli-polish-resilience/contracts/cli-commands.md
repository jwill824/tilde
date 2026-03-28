# Contract: CLI Commands (spec 002 delta)

**Spec 002 change**: Corrects the `--reconfigure` flag description (was incorrectly described
as "re-run wizard from scratch, ignoring any existing config" in spec 001 — it pre-populates
from the existing config). No new flags or exit codes added.

For the full command reference see `specs/001-mvp-macos-bootstrap/contracts/cli-commands.md`.
This document records only the changes introduced in spec 002.

---

## Changed: `--reconfigure` Flag

### Old behaviour (spec 001 description — incorrect)

> `--reconfigure` — Re-run wizard from scratch, ignoring any existing config.

### New behaviour (spec 002 — correct)

```
tilde --reconfigure [--config <path>]

  Load the existing tilde.config.json and re-run the full wizard with every field
  pre-populated from the stored values. The user may accept, change, or clear any
  field. On completion, overwrites the config file atomically.

  --config <path>  Optional. If provided, reconfigure targets that file instead
                   of the auto-resolved tilde.config.json.
```

**Behaviour contract**:

| Condition | Outcome |
|-----------|---------|
| `tilde.config.json` found and valid | All 14 wizard steps open pre-populated with stored values |
| `tilde.config.json` found but schema-invalid | Field-level errors shown; valid fields loaded as defaults; wizard opens |
| No `tilde.config.json` found | Error message + suggestion to run `tilde` without flags; exit code 1 |
| User exits wizard early (Ctrl-C or explicit cancel) | Original config preserved unmodified; exit code 5 |
| Wizard completed successfully | Config overwritten atomically (`tilde.config.json.tmp` → `tilde.config.json`) |
| Config file is read-only | Permissions error displayed with file path; exit code 1 |

**Mode interaction**:
- `--reconfigure` is incompatible with `--ci` / `--yes`. If both are passed, `--ci` takes
  precedence and `--reconfigure` is silently ignored (non-interactive mode runs as normal).
- `--reconfigure` does not write a checkpoint. If the user exits early, no `.tilde/state.json`
  resume point is created for the reconfigure session.

---

## No New Exit Codes

The existing exit code table from spec 001 is unchanged:

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error (see stderr) |
| 2 | Invalid config / schema validation failure |
| 3 | Missing required field in --ci mode |
| 4 | Plugin error |
| 5 | User cancelled (Ctrl-C during wizard) |

---

## No New Subcommands

The `tilde config validate` subcommand (from spec 001) already exercises the migration path
as a side-effect of calling `loadConfig()`. No new subcommand is needed for migration.
