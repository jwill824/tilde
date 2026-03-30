# Quickstart: UI/UX and Branding Consolidation

**Branch**: `005-ui-branding-consolidation` | **Date**: 2026-03-30

---

## Prerequisites

```bash
# Ensure you're on the feature branch
git checkout 005-ui-branding-consolidation

# Install CLI dependencies
npm install

# Install docs site dependencies
cd site/docs && npm install && cd ../..
```

---

## Testing the CLI (Non-Interactive Fix)

### Verify the fix works in a piped environment
```bash
# Build the CLI first
npm run build

# Simulate piped (non-interactive) launch — should print message and exit 0
echo "" | node dist/index.js
# Expected: "✓ tilde installed — run tilde in an interactive terminal to complete setup."

# Verify interactive mode still works normally
node dist/index.js
# Expected: splash screen → wizard
```

### Run unit tests
```bash
npm test
```

### Run integration tests
```bash
npx vitest run --config vitest.integration.config.ts
```

---

## Testing the Docs Site (Routing Fix)

```bash
cd site/docs

# Build and preview
npm run build
npm run preview
# Open http://localhost:4321/tilde/docs/

# Verify all sidebar links resolve correctly:
# - /tilde/docs/installation/
# - /tilde/docs/getting-started/
# - /tilde/docs/config-reference/
```

---

## Checking Brand Assets

```bash
# Verify design directory exists and has expected files
ls docs/design/
# Expected: thingstead-logo.svg, thingstead-logo.png, design-tokens.md

# Verify favicons exist
ls site/docs/public/favicon.svg
ls site/tilde/favicon.svg
```

---

## Verifying Domain Reference Cleanup

```bash
# Should return zero matches in active source files after fix
grep -rn "tilde\.sh" \
  src/ docs/ site/docs/src/ site/tilde/ tests/ README.md CONTRIBUTING.md \
  --include="*.ts" --include="*.tsx" --include="*.md" \
  --include="*.json" --include="*.sh" --include="*.html" \
  --include="*.mjs"
# Expected: no output
```

---

## Full Local Validation Checklist

```bash
# 1. CLI builds cleanly
npm run build

# 2. All tests pass
npm test
npx vitest run --config vitest.integration.config.ts
npx vitest run --config vitest.contract.config.ts

# 3. Lint passes
npm run lint

# 4. Docs site builds without errors
cd site/docs && npm run build && cd ../..

# 5. Zero tilde.sh references in source
grep -rn "tilde\.sh" src/ docs/ site/docs/src/ tests/ README.md --include="*.ts" --include="*.tsx" --include="*.md" --include="*.json"
# (should be empty)

# 6. Manual install script TTY test
echo "" | bash site/tilde/install.sh --dry-run 2>/dev/null || true
```
