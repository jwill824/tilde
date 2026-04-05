# Project Stack Template

**Schema Version**: 1.0
**Purpose**: Canonical field set for any project's `stack.md` file. When a speckit agent reads
an existing `stack.md`, it compares `schema_version` to this template's current version and
prompts only for missing fields.

> Copy this template to `.specify/memory/stack.md` and populate it by running `/speckit.specify`
> (auto-detect) or manually filling in each field. Fields marked **Required** must be present.
> Fields marked **Auto-detectable** can be inferred from repo files.

---

## Meta

```yaml
schema_version: "1.0"          # Required | Not auto-detectable — set by template
last_updated: "YYYY-MM-DD"     # Required | Auto-detectable: set on write
updated_by: ""                 # Required | Auto-detectable: agent name or "manual"
```

**Detection notes**:
- `schema_version`: Fixed at `"1.0"` when first created; increment on template upgrade
- `last_updated`: Set to today's date whenever stack.md is written
- `updated_by`: Set to the agent name (e.g., `speckit.specify`) or `manual`

---

## Packaging

```yaml
packaging:
  tool: ""              # Required | Auto-detectable: pnpm-lock.yaml → pnpm, yarn.lock → yarn, package-lock.json → npm, Pipfile.lock → pipenv, Cargo.lock → cargo, etc.
  workspace_file: ""    # Optional | Auto-detectable: pnpm-workspace.yaml, lerna.json, etc.
  lock_file: ""         # Required | Auto-detectable: file name of detected lock file
  install_cmd: ""       # Required | Auto-detectable: inferred from tool (e.g., "pnpm install")
  add_dep_cmd: ""       # Required | Auto-detectable: inferred from tool (e.g., "pnpm add <pkg> --filter <workspace>")
```

**Detection sources**:
- `pnpm-lock.yaml` → tool: `pnpm`
- `yarn.lock` → tool: `yarn`
- `package-lock.json` → tool: `npm`
- `Pipfile.lock` → tool: `pipenv`
- `poetry.lock` → tool: `poetry`
- `Cargo.lock` → tool: `cargo`
- `go.sum` → tool: `go modules`

---

## Version Constraints

```yaml
version_constraints:
  node_version: ""             # Optional | Auto-detectable: .nvmrc, engines.node in package.json
  package_manager_version: ""  # Optional | Auto-detectable: packageManager field in package.json
  language_version: ""         # Optional | Auto-detectable: tsconfig.json target, pyproject.toml python-requires, .ruby-version, etc.
```

**Detection sources**:
- `.nvmrc` → node_version
- `package.json` → `engines.node` → node_version; `packageManager` → package_manager_version
- `tsconfig.json` → `compilerOptions.target` → language_version (TypeScript)
- `pyproject.toml` → `tool.poetry.dependencies.python` → language_version (Python)
- `.ruby-version` → language_version (Ruby)

---

## Linting

```yaml
linting:
  tool: ""          # Required | Auto-detectable: eslint.config.*, .eslintrc*, .pylintrc, rubocop.yml, etc.
  config_file: ""   # Optional | Auto-detectable: first matching config file found
  lint_cmd: ""      # Required | Auto-detectable: from package.json scripts or inferred
  fix_cmd: ""       # Optional | Auto-detectable: from package.json scripts or inferred
```

**Detection sources**:
- `eslint.config.*` or `.eslintrc*` → tool: `ESLint`
- `.pylintrc` or `pyproject.toml [tool.pylint]` → tool: `pylint`
- `rubocop.yml` → tool: `RuboCop`
- `package.json` `scripts.lint` → lint_cmd
- `package.json` `scripts.lint:fix` → fix_cmd

---

## Testing

```yaml
testing:
  backend_framework: ""       # Required | Auto-detectable: devDependencies (vitest, jest, pytest, rspec, go test, etc.)
  backend_run_cmd: ""         # Required | Auto-detectable: package.json test script
  backend_contract_cmd: ""    # Optional | Auto-detectable: package.json test:contract script
  frontend_unit_cmd: ""       # Optional | Auto-detectable: frontend package.json test script
  frontend_e2e_framework: ""  # Optional | Auto-detectable: devDependencies (playwright, cypress, etc.)
  frontend_e2e_cmd: ""        # Optional | Auto-detectable: package.json test:e2e script
  e2e_requires_servers: false # Optional | Auto-detectable: true if playwright detected
```

**Detection sources**:
- `devDependencies.vitest` → backend_framework: `vitest`
- `devDependencies.jest` → backend_framework: `jest`
- `devDependencies.pytest` → backend_framework: `pytest`
- `devDependencies.@playwright/test` → frontend_e2e_framework: `playwright`, e2e_requires_servers: `true`
- `devDependencies.cypress` → frontend_e2e_framework: `cypress`

---

## Build

```yaml
build:
  build_cmd: ""          # Required | Auto-detectable: root package.json build script
  backend_build_cmd: ""  # Optional | Auto-detectable: backend package.json build script
  frontend_build_cmd: "" # Optional | Auto-detectable: frontend package.json build script
```

**Detection sources**:
- Root `package.json` `scripts.build` → build_cmd
- `backend/package.json` `scripts.build` → backend_build_cmd
- `frontend/package.json` `scripts.build` → frontend_build_cmd

---

## Infrastructure

```yaml
infrastructure:
  local_dev_cmd: ""        # Optional | Auto-detectable: root package.json dev script
  required_services: []    # Optional | Partial auto-detect: docker-compose.yml service names
  infra_start_cmd: ""      # Optional | Auto-detectable: "docker compose up -d" if docker-compose.yml present
```

**Detection sources**:
- Root `package.json` `scripts.dev` → local_dev_cmd
- `docker-compose.yml` services block → required_services
- `docker-compose.yml` presence → infra_start_cmd: `docker compose up -d`

---

## Database

> Include this section only if a database/ORM is detected in the project.

```yaml
database:
  orm: ""           # Optional | Auto-detectable: prisma, typeorm, drizzle, sqlalchemy, activerecord, etc.
  schema_file: ""   # Optional | Auto-detectable: prisma/schema.prisma, etc.
  migrate_cmd: ""   # Optional | Auto-detectable: package.json prisma:migrate script
  generate_cmd: ""  # Optional | Auto-detectable: package.json prisma:generate script
```

**Detection sources**:
- `dependencies.@prisma/client` or `devDependencies.prisma` → orm: `prisma`
- `dependencies.typeorm` → orm: `typeorm`
- `dependencies.drizzle-orm` → orm: `drizzle`
- `prisma/schema.prisma` → schema_file
- `package.json` `scripts.prisma:migrate` → migrate_cmd
- `package.json` `scripts.prisma:generate` → generate_cmd

---

## Project Type

```yaml
project_type:
  type: ""          # Required | Auto-detectable: web-service / mobile-app / library / cli / desktop-app / monorepo
  platforms: []     # Optional | Auto-detectable: from directory structure, Capacitor config, Tauri config
```

**Detection sources**:
- `pnpm-workspace.yaml` or `lerna.json` + multiple package dirs → type: `monorepo`
- `capacitor.config.*` → platforms includes `ios`, `android`
- `tauri.conf.json` → type: `desktop-app`
- `bin` field in `package.json` → type: `cli`
- Web server entry point detected → type: `web-service`

**Allowed values for `type`**:
- `web-service` — REST/GraphQL API or web application
- `mobile-app` — iOS/Android native or cross-platform
- `library` — npm/pip/crate package for consumption by other code
- `cli` — command-line tool
- `desktop-app` — Electron, Tauri, or similar
- `monorepo` — multiple packages in one repo

---

## Commit Convention

```yaml
commit_convention:
  format: "<type>(<scope>): <description>"  # Required | Not auto-detectable — copy from constitution
  phase_commit_formats:                      # Required | Not auto-detectable — copy from constitution
    specify: "docs(spec): initialize NNN-feature-name spec"
    clarify: "docs(clarify): update NNN-feature-name spec with clarifications"
    plan: "docs(plan): add implementation plan for NNN-feature-name"
    tasks: "docs(tasks): generate task breakdown for NNN-feature-name"
    implement: "feat(NNN): implement <phase description>"
    analyze: "docs(analyze): add consistency report for NNN-feature-name"
    constitution: "docs: amend constitution to vX.Y.Z (<change summary>)"
```

**Notes**:
- Format follows the [Conventional Commits](https://www.conventionalcommits.org/) specification
- Spec-kit phase commit formats are defined in `.specify/memory/constitution.md` Principle VI
- Copy values from constitution; do not deviate without a constitution amendment

---

## Regression Tests

> These are the commands speckit agents use for post-phase validation. Must match Testing section above.

```yaml
regression_tests:
  lint_cmd: ""    # Required | Auto-detectable: same as linting.lint_cmd
  test_cmd: ""    # Required | Auto-detectable: same as testing.backend_run_cmd
  e2e_cmd: ""     # Optional | Auto-detectable: same as testing.frontend_e2e_cmd
  e2e_requires: ""  # Optional | Human-readable note about server startup requirements
```

**Example values**:
```yaml
regression_tests:
  lint_cmd: "pnpm lint"
  test_cmd: "pnpm test"
  e2e_cmd: "cd frontend && pnpm test:e2e"
  e2e_requires: "Requires docker compose up -d + pnpm dev (both servers)"
```

---

## Version Upgrade Procedure

When `schema_version` in an existing `stack.md` is lower than this template's current version:

1. Agent reads existing `stack.md` and notes the `schema_version`
2. Agent reads this `stack-template.md` and identifies all fields not present in existing file
3. For each missing field: attempt auto-detect first; if not detectable, prompt developer
4. Append missing fields to existing `stack.md` under their correct sections
5. Update `schema_version`, `last_updated`, `updated_by`
6. Commit updated `stack.md` using `conventional-commit` skill

**Invariant**: Fields already present in `stack.md` are NEVER overwritten during a version upgrade.
