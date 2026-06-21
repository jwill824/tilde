---
phase: 03-dotfiles-discovery-map
reviewed: 2026-06-19T22:43:31Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/inventory/dotfiles.ts
  - src/inventory/report.ts
  - src/inventory/scan.ts
  - src/inventory/summary.ts
  - tests/unit/inventory-dotfiles.test.ts
  - tests/unit/inventory-scanner.test.ts
  - tests/integration/wizard-flow.test.tsx
  - tests/integration/config-first.test.ts
findings:
  critical: 4
  warning: 1
  info: 0
  total: 5
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-06-19T22:43:31Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Reviewed the Phase 03 dotfile map, inventory report integration, summary output, and unit/integration tests. The implementation adds the intended scanner surface, but several privacy and robustness requirements are not met: ignored secret files can still be scanned and read, warning text leaks absolute paths into default terminal output, collection errors can fail the whole inventory scan, and source parsing can persist arbitrary trailing shell text.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: BLOCKER - Secret-pattern files can still be scanned and read

**File:** `src/inventory/dotfiles.ts:278`
**Issue:** The scanner filters home-root dotfiles through `filterDotfiles()`, but metadata directories, dotfiles repo candidates, and workspace shallow candidates bypass the secret-pattern filter. `collectMetadataCandidates()` recursively adds every file under metadata directories at lines 278-285, `collectRootAndShallowCandidates()` adds repo files including root dotfiles at lines 321-328, and `collectWorkspaceCandidates()` adds `.config/*/*` paths at lines 338-344. Every candidate is then read at lines 378-381 before rc parsing is even needed. That means `.env`, `.env.*`, `*.key`, `*.pem`, logs, and other excluded files under `~/.config/<tool>`, a dotfiles repo, or a workspace `.config` directory are read and recorded as file evidence, violating the phase threat model and the project security rule to avoid raw secret exposure.
**Fix:**
```ts
function shouldScanCandidate(filePath: string, filter = createCaptureFilter()): boolean {
  const relativeName = filePath.split(sep).join('/');
  return !filter.ignores(basename(filePath)) && !filter.ignores(relativeName);
}

// Apply before adding every metadata/repo/workspace candidate.
if (!shouldScanCandidate(filePath)) {
  continue;
}

// Only read rc files; for non-rc files, lstat/access is enough to create path evidence.
const findings = createMetadataFindings(candidate.queryPath);
if (isRcFile(candidate.path)) {
  const content = await readFile(candidate.path, 'utf-8');
  findings.push(...parseShellRcFindings(candidate.path, content));
}
```
Add regression tests with `.env`, `.env.local`, `id_rsa.key`, and `debug.log` under metadata, dotfiles repo, and workspace allowlist directories.

### CR-02: BLOCKER - Dotfile warnings leak absolute local paths in default terminal output

**File:** `src/inventory/dotfiles.ts:363`
**Issue:** Symlink and unreadable warnings include the full candidate path (`${candidate.path}`) at lines 363 and 382. `summarizeInventory()` then prints every warning message by default at lines 25-29 in `src/inventory/summary.ts`, and both wizard/config-first surfaces render those summary lines. A skipped symlink such as `/Users/alice/.ssh/config` or an unreadable private rc file will therefore be displayed in the default UI, contradicting the phase requirement that default output stay aggregate and not dump detailed paths.
**Fix:**
```ts
const warning = pushDotfileWarning(warnings, 'Skipped symlink dotfile candidate.');
return {
  path: candidate.path,
  scope: candidate.scope,
  state: 'skipped',
  toolIds: [],
  findings: [],
  warningIds: [warning.id],
};
```
Keep the detailed path only in structured audit data if it is intentionally part of the non-default report, or store a redacted path such as `~/<basename>`. Add wizard and config-first tests where a dotfile warning contains a private absolute path and assert the rendered inventory block omits it.

### CR-03: BLOCKER - Dotfile filesystem errors can reject the entire inventory scan

**File:** `src/inventory/dotfiles.ts:263`
**Issue:** The phase requires unreadable paths and malformed local filesystem state to become warnings/skips, but collection-time errors are not contained. `statIfExists()` rethrows anything except `ENOENT`/`ENOTDIR` at lines 697-705, and callers in metadata/root/workspace collection do not catch it. The same is true for `fast-glob` calls at lines 278, 301, 321, and 338. Because `scanInventory()` awaits `scanDotfileMap()` directly at `src/inventory/scan.ts:58`, an `EACCES`, `EPERM`, or malformed cwd from a local candidate can fail the whole inventory scan instead of returning a usable report with dotfile warnings.
**Fix:**
```ts
async function collectSafely(
  warnings: InventoryWarning[],
  scope: DotfileScanScope,
  operation: () => Promise<DotfileCandidate[]>
): Promise<DotfileCandidate[]> {
  try {
    return await operation();
  } catch {
    pushDotfileWarning(warnings, `Skipped ${scope} dotfile scan segment.`);
    return [];
  }
}
```
Thread `warnings` into candidate collection, catch per scan segment, and add tests that mock `lstat`/`fast-glob` to throw `EACCES` and verify `scanDotfileMap()` resolves with a warning.

### CR-04: BLOCKER - Source parsing can persist arbitrary trailing shell text

**File:** `src/inventory/dotfiles.ts:202`
**Issue:** The source regex captures everything after `source` or `.` through the end of the line at lines 202-204. `createSourceFinding()` then stores that full target whenever it is not command substitution at lines 571-582. Lines such as `source ~/.aliases; export TOKEN=plainsecret`, `. "$HOME/.profile" && echo "$SECRET"`, or `source ~/.private # token hint` can persist command text, env references, comments, or secret-looking trailing content in `safeDetails.target`. This violates the plan boundary to store only normalized source targets or safe kinds, not arbitrary shell text.
**Fix:**
```ts
function parseSourceTarget(rawTarget: string): { sourceKind: 'literal' | 'reference' | 'command-derived'; target?: string } {
  const stripped = stripInlineComment(rawTarget).trim();
  if (/[;&|<>]/.test(stripped) || /\$\(|`/.test(stripped)) {
    return { sourceKind: 'command-derived' };
  }
  const target = stripped.replace(/^(['"])(.*)\1$/, '$2');
  return { sourceKind: classifySourceTarget(target), target };
}
```
Add tests for semicolon, `&&`, inline comments, and command substitutions to ensure serialized findings do not contain trailing shell commands or secret-like substrings.

## Warnings

### WR-01: WARNING - Known hook matching creates false known-tool evidence from arbitrary text

**File:** `src/inventory/dotfiles.ts:531`
**Issue:** `knownHookForLine()` checks for `direnv hook`, `vfox activate`, `op signin`, and `brew shellenv` anywhere in a non-comment line. Because `parseKnownHook()` runs before alias/export/source parsing, harmless lines like `alias explain='echo run direnv hook zsh'` or `echo "brew shellenv"` become high-confidence known `tool-init-hook` findings. That can mislead downstream provenance by turning documentation or aliases into trusted tool initialization evidence.
**Fix:** Restrict hook recognition to actual shell initialization forms, such as `eval "$(direnv hook zsh)"`, `eval "$(vfox activate zsh)"`, `eval "$(op signin)"`, or `eval "$(/opt/homebrew/bin/brew shellenv)"`, with anchored patterns. Add negative tests for aliases and echo lines containing the same words.

---

_Reviewed: 2026-06-19T22:43:31Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
