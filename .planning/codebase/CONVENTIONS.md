# Coding Conventions

**Analysis Date:** 2026-06-12

## Naming Patterns

**Files:**
- Kebab-case for most source files, for example `src/utils/config-discovery.ts`.
- `index.ts` or `index.tsx` for package or directory entry points.
- Tests use `*.test.ts` or `*.test.tsx` in `tests/unit/`, `tests/integration/`, and `tests/contract/`.

**Functions:**
- camelCase for functions such as `loadConfig`, `writeConfig`, `installAll`, and `discoverConfig`.
- React component functions use PascalCase such as `Wizard`, `App`, and `ConfigFirstMode`.
- Event handlers commonly use `handle...` naming inside components and steps.

**Variables:**
- camelCase for locals and props.
- UPPER_SNAKE_CASE for constants such as `SECRET_PATTERN`, `VERSION`, and `DEFAULT_CONFIGURATIONS`.

**Types:**
- PascalCase for interfaces and type aliases.
- No `I` prefix on interfaces.
- Exported config-derived types live near the schema in `src/config/schema.ts`.

## Code Style

**Formatting:**
- Two-space indentation is used throughout TypeScript source.
- Single quotes are used for strings.
- Semicolons are required.
- JSX is used in `.tsx` files for Ink UI.

**Linting:**
- ESLint config lives in `eslint.config.js`.
- Run with `npm run lint`.
- TypeScript strict mode is enabled in `tsconfig.json`.

## Import Organization

**Order:**
1. External packages, for example `react`, `ink`, `zod`, and `execa`.
2. Node built-ins, often using `node:` specifiers.
3. Internal relative imports.
4. Type-only imports where possible.

**Grouping:**
- Source uses relative imports rather than path aliases.
- NodeNext ESM requires `.js` extensions in TypeScript source imports, for example `./app.js`.

**Path Aliases:**
- No path aliases are configured in `tsconfig.json`.

## Error Handling

**Patterns:**
- Config parsing throws descriptive `Error` instances in `src/config/reader.ts`.
- External command execution throws `PluginError` from `src/utils/exec.ts`.
- Plugin implementations wrap domain failures in `PluginError` where appropriate.
- Interactive UI modes store an error phase/state and render errors to the terminal.
- Subcommands often write to stderr and call `process.exit()` with explicit exit codes.

**Error Types:**
- `PluginError` in `src/plugins/api.ts` carries plugin id, code, original error, and severity.
- Validation errors use `zod-validation-error` to produce readable messages.

## Logging

**Framework:**
- No logging framework.
- CLI output uses `process.stdout.write`, `process.stderr.write`, Ink `<Text>`, and occasional `console.log`.

**Patterns:**
- Subcommands use stdout/stderr directly for deterministic output.
- Dotfile writer and plugin guidance use console output for operational messages.
- CI scripts use console output and explicit `process.exit()`.

## Comments

**When to Comment:**
- Comments are used to explain workflow constraints, migration behavior, and non-obvious runtime behavior.
- Examples include the TTY guard and cursor restoration in `src/index.tsx`.

**JSDoc/TSDoc:**
- Used selectively on public helpers and plugin implementations.
- Not mandatory for every function.

**TODO Comments:**
- Existing TODO found in `.github/copilot-instructions.md`, not in core source.

## Function Design

**Size:**
- UI components and command handlers can be medium-large when they represent full flow state machines.
- Pure helpers are generally extracted into `src/utils/`, `src/config/`, or `src/dotfiles/`.

**Parameters:**
- Options objects are used where parameter sets grow, for example `installAll(config, registry, opts)`.
- Schema-derived types are passed through rather than duplicating shape definitions.

**Return Values:**
- Async functions return promises and throw on unexpected failure.
- Plugin methods return structured result objects where partial failure is expected, such as `installPackages()`.

## Module Design

**Exports:**
- Named exports are common for utilities and React components.
- First-party plugin implementation modules often default-export singleton plugin instances.

**Barrel Files:**
- No broad source barrel pattern is used.
- `src/plugins/registry.ts` centralizes plugin registration.

## Practical Rules for Future Changes

- Keep schema changes, migrations, docs, and tests together.
- Preserve NodeNext `.js` import extensions.
- Mock external commands in tests; avoid running real `brew`, `gh`, `op`, `vfox`, or `defaultbrowser`.
- Use existing plugin interfaces instead of hardcoding new integrations inside wizard steps.
- Guard user secrets as backend references, not resolved values.

---

*Convention analysis: 2026-06-12*
*Update when patterns change*
