# Contract: Config Format Document

**Spec**: 006-docs-polish-spec-hygiene  
**FR**: FR-001, FR-002, FR-003, FR-004, FR-005  
**Type**: Documentation contract (output file specification)

---

## Contract

`docs/config-format.md` is the authoritative standalone reference for `tilde.config.json`. It MUST exist at exactly this repo path (not only within the Astro docs site source tree).

---

## Completeness requirement

The document MUST cover 100% of fields in `src/config/schema.ts` (`TildeConfigSchema`). Verified by comparing documented fields against Zod schema exports. As of spec 006:

### Required fields checklist

**Top-level** (TildeConfigSchema):
- [x] `$schema` — optional string (JSON Schema URL for editor tooling)
- [x] `version` — literal `"1"`, required
- [x] `schemaVersion` — integer ≥ 1, default `1`, required
- [x] `os` — literal `"macos"`, required
- [x] `shell` — enum `"zsh" | "bash" | "fish"`, required
- [x] `packageManager` — literal `"homebrew"`, required
- [x] `versionManagers` — array of VersionManager, required
- [x] `languages` — array of Language, required
- [x] `workspaceRoot` — string, required
- [x] `dotfilesRepo` — string (absolute or `~/`-prefixed), required
- [x] `contexts` — array of DeveloperContext (min 1), required
- [x] `tools` — array of strings, optional (default `[]`)
- [x] `configurations` — ConfigurationDomains object, required
- [x] `accounts` — array of Account, optional (default `[]`)
- [x] `secretsBackend` — enum `"1password" | "keychain" | "env-only"`, required

**VersionManager object**:
- [x] `name` — enum `"vfox" | "nvm" | "pyenv" | "sdkman"`

**Language object**:
- [x] `name` — string
- [x] `version` — string
- [x] `manager` — string (must reference a `versionManagers[].name`)

**DeveloperContext object**:
- [x] `label` — string (must be unique across contexts)
- [x] `path` — string
- [x] `git.name` — string
- [x] `git.email` — valid email string
- [x] `github.username` — optional string
- [x] `authMethod` — enum `"gh-cli" | "https" | "ssh"` — **wizard phrasing required**
- [x] `envVars` — optional array of EnvVarReference — **wizard phrasing required**
- [x] `vscodeProfile` — optional string
- [x] `isDefault` — optional boolean

**EnvVarReference object**:
- [x] `key` — string
- [x] `value` — string (secrets backend reference; blocked patterns: `ghp_`, `sk-`, `AKIA`, `xox[bp]-`)

**ConfigurationDomains object**:
- [x] `git` — boolean
- [x] `vscode` — boolean
- [x] `aliases` — boolean
- [x] `osDefaults` — boolean
- [x] `direnv` — boolean

**Account object**:
- [x] `service` — string
- [x] `identifier` — string
- [x] `secretRef` — optional string

---

## Annotated example requirement (FR-003)

The document MUST include a complete annotated example covering:
- All required fields
- Representative optional fields (`$schema`, `tools`, `accounts`, `vscodeProfile`, `isDefault`)
- Multiple contexts (to demonstrate context array)
- Inline comments on every field (using `//` in JSON with a note that real JSON doesn't support comments, or using a side-by-side callout table)
- `schemaVersion: 1` explicitly set

---

## Schema versioning section requirement (FR-004)

The schema versioning section MUST contain all of:

1. **What `schemaVersion` means** — version number of the config file format; tilde reads this at startup to decide whether migration is needed
2. **v1: inaugural schema** — explicit statement that v1 is the first version; no prior versions exist; any config already at v1 requires no migration
3. **Migration runner behaviour** — when a config with `schemaVersion < current` is loaded: tilde detects the version, applies all applicable migration steps in order, writes back atomically, and notifies the user. Migration is always additive and non-destructive (adds defaults, renames deprecated fields; never removes user data or alters user-set values). If migration fails: warn the user, preserve the original file unmodified, offer wizard re-run.
4. **Forward version handling** — if a config's `schemaVersion` is higher than the installed tilde supports: warn the user and open in read-only mode; prompt to upgrade tilde
5. **Future migration template skeleton** — a clearly labelled example block showing the pattern future v2 migration entries will follow

---

## Audience and language requirements (FR-005)

- No references to TypeScript, Zod, compiler behaviour, or internal types
- No jargon: "enum" → "one of the following values"; "optional" → "you don't have to set this"; "array" → "list"
- Technically-named fields use wizard-equivalent descriptions (see `data-model.md` Wizard-Equivalent Phrasing Map)
- All valid value sets are written as plain lists, not type union syntax

---

## File format requirements

- Plain Markdown (no Astro frontmatter, no MDX, no shortcodes)
- Renders correctly on GitHub.com (table syntax, fenced code blocks)
- No relative links that would break outside the docs site context
- All internal links are anchor references within the same document
