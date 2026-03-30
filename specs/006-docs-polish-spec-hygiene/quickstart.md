# Quickstart: Implementing Spec 006

**Branch**: `006-docs-polish-spec-hygiene`  
**For**: Implementer picking up this work from scratch

---

## What this spec delivers

5 user stories, all documentation / hygiene — no new APIs, no schema changes, no new tests beyond a unit test for version reading:

| Story | Priority | Work type | Files changed |
|---|---|---|---|
| US1: Config-format docs | P1 | Create doc | `docs/config-format.md` (new) |
| US2: Dynamic CLI version | P1 | Source fix | `src/index.tsx` (1 line) |
| US3: README logo + SVG | P2 | Create asset + update doc | `docs/design/tilde-logo-variation.svg` (new), `README.md` |
| US4: Markdown location audit | P2 | Verification only | None (already compliant) |
| US5: Spec 005 hygiene | P3 | Edit spec artifacts | `specs/005-ui-branding-consolidation/spec.md`, `tasks.md` |

---

## Prerequisites

```bash
git checkout 006-docs-polish-spec-hygiene
cd /Users/jeff.williams/Developer/personal/tilde
```

Verify you can build and run tests:

```bash
npm run build
npm test
```

---

## Step 1: Fix dynamic version in CLI (US2 — P1)

**File**: `src/index.tsx`

Replace line 15:
```typescript
// BEFORE
const VERSION = '0.1.0';

// AFTER
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

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

const VERSION = readPackageVersion();
```

> Note: `fileURLToPath` and `dirname`/`resolve` are likely already imported in the file (check existing `import` lines at the top — `resolve` is used on line ~16 via `node:path`). Add only what is missing.

**Verify**:
```bash
npm run build
node dist/index.js --version  # Should print: tilde v1.2.0
```

---

## Step 2: Create `docs/config-format.md` (US1 — P1)

**Source**: `site/docs/src/content/docs/config-format.md` (existing Starlight draft — accurate but incomplete)

**Steps**:
1. Copy the Starlight draft to `docs/config-format.md`
2. Remove the Astro frontmatter block (`--- title: ... ---` at top)
3. Add a Markdown H1 header: `# tilde Configuration Format`
4. Expand the schema versioning section (bottom of file) per `contracts/config-format-doc.md` requirements:
   - Add explicit statement that v1 is the inaugural schema
   - Add migration runner behaviour detail
   - Add forward-version warning behaviour
   - Add future migration template skeleton
5. Apply wizard-equivalent phrasing to `authMethod`, `envVars`, and `secretsBackend` per `data-model.md` Phrasing Map
6. Verify the annotated example includes `schemaVersion: 1` and covers all required fields

**Verify**:
```bash
# Check all schema fields are documented
grep -c "authMethod\|envVars\|secretsBackend\|schemaVersion\|workspaceRoot\|dotfilesRepo\|contexts\|versionManagers" docs/config-format.md
# Should find ≥ 8 matches
```

---

## Step 3: Create tilde logo variation SVG (US3 — P2)

**File**: `docs/design/tilde-logo-variation.svg`

Create the SVG per `contracts/logo-variation.md`. Key attributes:
- `viewBox="0 0 120 60"`, no fixed width/height
- Dark background rect `fill="#030712" rx="8"`
- Wave bezier path: `stroke="#4ade80" stroke-width="4" stroke-linecap="round" fill="none"`
- The tilde character `~` as a `<text>` element in `#4ade80`
- `<title>tilde</title>` for accessibility

**Verify**:
```bash
# File exists and is valid XML
xmllint --noout docs/design/tilde-logo-variation.svg && echo "Valid SVG"
```

---

## Step 4: Update README.md header (US3 — P2)

**File**: `README.md`

In the `<div align="center">` block, insert the logo `<img>` above the banner:

```html
<div align="center">
  <img src="docs/design/tilde-logo-variation.svg" alt="tilde" width="160"/>
  <br/><br/>
  <img src="docs/banner.svg" alt="tilde — developer environment bootstrap" width="560"/>
  ...rest unchanged...
</div>
```

**Verify**: Open README.md preview in VS Code or view on GitHub to confirm both images render.

---

## Step 5: Markdown location audit (US4 — P2)

Run the audit to confirm the repo root is already compliant:

```bash
# Should return only README.md, CONTRIBUTING.md, CHANGELOG.md
find /Users/jeff.williams/Developer/personal/tilde -maxdepth 1 -name "*.md" | sort
```

Expected output — exactly three files:
```
/Users/jeff.williams/Developer/personal/tilde/CHANGELOG.md
/Users/jeff.williams/Developer/personal/tilde/CONTRIBUTING.md
/Users/jeff.williams/Developer/personal/tilde/README.md
```

No migration needed. Record verification result as SC-003 pass.

---

## Step 6: Spec 005 hygiene corrections (US5 — P3)

### 6a. Edit `specs/005-ui-branding-consolidation/spec.md`

Find FR-006 (line 93):
```
- **FR-006**: Brand colors and typeface MUST be defined and applied consistently across: README, install page, docs site, and CLI splash screen.
```

Replace with:
```
- **FR-006**: Brand colors and typeface MUST be defined and applied consistently across: the install page, docs site, and CLI splash screen. GitHub Markdown surfaces (README) are excluded — custom CSS cannot be applied to GitHub-rendered Markdown.
```

### 6b. Edit `specs/005-ui-branding-consolidation/tasks.md`

Find T0021 (line ~82) and add after its main description:
```
  - **Depends on**: T0011 — both T0021 and T0011 modify `site/docs/astro.config.mjs`; run T0011 to completion before starting T0021 to avoid merge conflicts.
```

Find T0025 (line ~97) and add after its main description:
```
  - **Depends on**: T0011 — both T0025 and T0011 modify `site/docs/astro.config.mjs`; run T0011 to completion before starting T0025 to avoid merge conflicts.
```

---

## Acceptance checklist

| SC | Check | How to verify |
|---|---|---|
| SC-001 | Config-format doc complete | Compare fields against `src/config/schema.ts` |
| SC-002 | Splash version matches package.json | `node dist/index.js --version` → compare to `jq .version package.json` |
| SC-003 | No extra root `.md` files | `find . -maxdepth 1 -name "*.md"` → 3 results |
| SC-004 | Logo visible and centred in README | View README on GitHub |
| SC-005 | SVG renders without errors | Open in browser; `xmllint --noout` passes |
| SC-006 | Spec 005 FR-006 has no CSS/README ref | Read revised FR-006 |
| SC-007 | T0021 and T0025 declare T0011 dependency | Read tasks.md entries |
| SC-008 | 100% schema field coverage | Field-by-field compare vs Zod schema |
