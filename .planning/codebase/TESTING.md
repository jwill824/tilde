# Testing Patterns

**Analysis Date:** 2026-06-12

## Test Framework

**Runner:**
- Vitest 4.
- Unit config: `vitest.config.ts`.
- Integration config: `vitest.integration.config.ts`.
- Contract config: `vitest.contract.config.ts`.

**Assertion Library:**
- Vitest built-in `expect`.
- Vitest globals are enabled in all three configs.

**Run Commands:**
```bash
npm test                    # Run unit tests
npm run test:watch          # Watch mode
npm run test:integration    # Run integration tests
npm run test:contract       # Run contract tests
npm run lint                # Lint src
npm run build               # TypeScript build
```

## Test File Organization

**Location:**
- Unit tests live under `tests/unit/`.
- Integration tests live under `tests/integration/`.
- Contract tests live under `tests/contract/`.
- Shared fixtures live under `tests/fixtures/`.

**Naming:**
- Unit tests: `tests/unit/<topic>.test.ts` or `.test.tsx`.
- Integration tests: `tests/integration/<flow>.test.ts` or `.test.tsx`.
- Contract tests: `tests/contract/<contract>.test.ts`.

**Structure:**
```text
tests/
|-- contract/
|   |-- account-connector.contract.test.ts
|   |-- config-schema.test.ts
|   `-- version-manager.contract.test.ts
|-- fixtures/
|   `-- tilde.config.json
|-- integration/
|   |-- cli-regression.test.ts
|   |-- config-first.test.ts
|   `-- wizard-flow.test.tsx
`-- unit/
    |-- config-discovery.test.ts
    |-- config-schema.test.ts
    |-- wizard-navigation.test.ts
    `-- utils/environment.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
describe('module or behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles the expected behavior', async () => {
    const result = await subjectUnderTest();
    expect(result).toEqual(expected);
  });
});
```

**Patterns:**
- Use `describe` and `it` for behavior grouping.
- Use `beforeEach` to reset mocks.
- Async tests use `async`/`await`.
- Component tests use Ink testing helpers where rendering is involved.

## Mocking

**Framework:**
- Vitest `vi.mock`, `vi.fn`, and `vi.mocked`.

**Patterns:**
```typescript
vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
}));

vi.mock('../../src/utils/exec.js', () => ({
  run: vi.fn(),
}));
```

**What to Mock:**
- External command execution through `execa`.
- `src/utils/exec.ts` when testing capture or plugin behavior.
- File system/home environment when testing config discovery or environment detection.

**What Not to Mock:**
- Zod schema validation.
- Pure config migration logic.
- Small pure helpers where direct assertions are clearer.

## Fixtures and Factories

**Test Data:**
- `tests/fixtures/tilde.config.json` is the shared valid config sample.
- Many tests construct focused config objects inline to make expected behavior explicit.

**Location:**
- Shared fixture files belong in `tests/fixtures/`.
- Single-test data usually stays in the test file.

## Coverage

**Requirements:**
- No hard coverage threshold is configured.
- Unit coverage provider is V8.

**Configuration:**
- `vitest.config.ts` includes coverage for `src/**/*`.
- Coverage reporters are `text` and `lcov`.

**View Coverage:**
```bash
npm test -- --coverage
```

## Test Types

**Unit Tests:**
- Scope: schema validation, migrations, helpers, wizard navigation, UI summary logic, plugin utilities.
- Location: `tests/unit/`.
- Speed: default Vitest timeout.

**Integration Tests:**
- Scope: CLI behavior and multi-component flows.
- Location: `tests/integration/`.
- Timeout: 60000ms in `vitest.integration.config.ts`.

**Contract Tests:**
- Scope: plugin and config contracts.
- Location: `tests/contract/`.
- Useful when changing `src/plugins/api.ts` or schema fields.

**E2E Tests:**
- No browser E2E framework detected.

## Common Patterns

**Async Testing:**
```typescript
it('loads a config', async () => {
  await expect(loadConfig(path)).resolves.toMatchObject({ version: '1' });
});
```

**Error Testing:**
```typescript
it('rejects invalid config', async () => {
  await expect(loadConfig(path)).rejects.toThrow('Config validation failed');
});
```

**CLI Regression Testing:**
- `tests/integration/cli-regression.test.ts` runs the built CLI with `node` and `execa`.
- Keep CLI output deterministic when adding subcommands.

## CI Verification

- `.github/workflows/ci.yml` runs lint, build, config doc validation, unit tests, contract tests, and integration tests.
- CI uses Node 22 even though package engines allow Node >=20.

---

*Testing analysis: 2026-06-12*
*Update when testing tools or test organization changes*
