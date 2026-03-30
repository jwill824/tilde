# Contract: Runtime Version Reading

**Spec**: 006-docs-polish-spec-hygiene  
**FR**: FR-006, FR-007, FR-008  
**Type**: Internal module contract

---

## Contract

The `readPackageVersion()` function is an exported helper in `src/index.tsx` (exported for testability; not intended as a public API) that reads the running tilde version from `package.json` at startup.

### Signature

```typescript
export function readPackageVersion(): string
```

### Guarantees

| Guarantee | Detail |
|---|---|
| **Return type** | Always `string` — never throws |
| **Normal return** | Semver string from `package.json` `"version"` field (e.g., `"1.2.0"`) |
| **Fallback return** | `"unknown"` on any error (file not found, JSON parse failure, missing field) |
| **ESM-safe** | Resolves path via `import.meta.url` — no `__dirname`, no `createRequire` |
| **Mechanism** | `readFileSync` + `JSON.parse` only — no import assertions, no `process.env.npm_package_version` |
| **Sync** | Synchronous — called once at module load time before `parseCliArgs()` |

### Path resolution

```
import.meta.url → file:///path/to/dist/index.js
fileURLToPath(import.meta.url) → /path/to/dist/index.js
dirname(...) → /path/to/dist
resolve(dirname, '../package.json') → /path/to/package.json  ✓
```

### Error contract

All errors are caught internally. The caller receives `'unknown'` for any failure:

```typescript
function readPackageVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const pkgPath = resolve(__dirname, '../package.json');
    const raw = readFileSync(pkgPath, 'utf8');
    return (JSON.parse(raw) as { version?: string }).version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}
```

### Downstream contract

The value returned by `readPackageVersion()` replaces the `const VERSION = '0.1.0'` constant on line 15 of `src/index.tsx`. It flows as:

```
VERSION → App.props.version → captureEnvironment(version) → EnvironmentSnapshot.tildeVersion
       → Splash display: v{tildeVersion}
       → CompactHeader display: v{tildeVersion}
       → --version flag output: tilde v{VERSION}
```

All three display points MUST show the same value. No manual synchronisation step is permitted.

### Excluded mechanisms (per FR-006)

- ❌ `createRequire(import.meta.url)('./package.json').version`
- ❌ `import pkg from './package.json' assert { type: 'json' }`
- ❌ `process.env.npm_package_version`
- ❌ Hardcoded string constants
- ❌ Build-time substitution via `esbuild.define` or similar

---

## Testing contract

**Existing test coverage**: `tests/unit/utils/environment.test.ts` tests `captureEnvironment('1.2.3')` and verifies `snapshot.tildeVersion === '1.2.3'`. This is sufficient for the environment chain.

**New test required**: Unit test for `readPackageVersion()` itself:
- Normal case: returns version string matching `package.json`
- Fallback case: returns `'unknown'` when path resolves to a nonexistent file (mock `readFileSync` to throw)
