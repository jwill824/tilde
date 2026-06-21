# Phase 1: Tool Metadata Registry - Pattern Map

**Mapped:** 2026-06-13
**Files analyzed:** 8
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/tools/metadata.ts` | model | transform | `src/config/schema.ts` | role-match |
| `src/tools/registry.ts` | utility | transform | `src/data/language-versions.ts` | role-match |
| `src/plugins/first-party/browser/metadata.ts` | config | transform | `src/plugins/first-party/ai-tools/index.ts` | role-match |
| `src/plugins/first-party/browser/index.ts` | service | request-response | `src/plugins/first-party/browser/index.ts` | exact |
| `src/steps/browser.tsx` | component | event-driven | `src/steps/ai-tools.tsx` | role-match |
| `tests/unit/tool-metadata.test.ts` | test | transform | `tests/unit/ai-tools.test.ts` | role-match |
| `tests/unit/browser-plugins.test.ts` | test | request-response | `tests/unit/browser-plugins.test.ts` | exact |
| `tests/integration/wizard-flow.test.tsx` | test | event-driven | `tests/integration/wizard-flow.test.tsx` | exact |

## Pattern Assignments

### `src/tools/metadata.ts` (model, transform)

**Analog:** `src/config/schema.ts`

**Imports pattern** (lines 1-1):
```typescript
import { z } from 'zod';
```

**Schema pattern** (lines 5-11, 60-77):
```typescript
const EnvVarReferenceSchema = z.object({
  key: z.string().min(1),
  value: z.string().refine(
    (v) => !SECRET_PATTERN.test(v),
    { message: 'envVar value must be a backend reference, not a resolved secret' }
  ),
});

const BrowserConfigSchema = z.object({
  selected: z.array(z.string()).default([]),
  default: z.string().nullable().default(null),
});

const AIToolConfigSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  variant: z.string().min(1),
});
```

**Validation/refinement pattern** (lines 79-134):
```typescript
const TildeConfigSchema = z.object({
  $schema: z.string().default('https://thingstead.io/tilde/config-schema/v1.json'),
  version: z.literal('1').default('1'),
  schemaVersion: z.union([z.string(), z.number()])
    .transform(v => String(v))
    .default('1.6'),
  os: z.literal('macos').default('macos'),
  shell: z.enum(['zsh', 'bash', 'fish']),
}).superRefine((config, ctx) => {
  const labels = config.contexts.map(c => c.label);
  const seen = new Set<string>();
  labels.forEach((label, idx) => {
    if (seen.has(label)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate context label: "${label}"`,
        path: ['contexts', idx, 'label'],
      });
    }
    seen.add(label);
  });
});
```

**Export pattern** (lines 136-144):
```typescript
export { TildeConfigSchema, DeveloperContextSchema, BrowserConfigSchema, EditorsConfigSchema, AIToolConfigSchema, LanguageBindingSchema };
export type TildeConfig = z.infer<typeof TildeConfigSchema>;
export type BrowserConfig = z.infer<typeof BrowserConfigSchema>;
export type AIToolConfig = z.infer<typeof AIToolConfigSchema>;
```

**Apply:** Define `PlatformSchema`, `ToolMetadataSchema`, array validation helpers, and inferred `ToolMetadata` types here. Import `PluginCategory` as a type from `../plugins/api.js`; keep `.js` import extensions.

---

### `src/tools/registry.ts` (utility, transform)

**Analog:** `src/data/language-versions.ts`

**Static catalog pattern** (lines 1-50):
```typescript
export interface LanguageCatalogEntry {
  label: string;
  versions: string[];
  managers: string[];
}

export const LANGUAGE_CATALOG: Record<string, LanguageCatalogEntry> = {
  node: {
    label: 'Node.js',
    versions: ['22 (LTS)', '20 (LTS)', '18', '16'],
    managers: ['nvm', 'fnm', 'vfox'],
  },
};

export const LANGUAGE_KEYS = Object.keys(LANGUAGE_CATALOG);
```

**Lookup data pattern** (lines 52-61):
```typescript
export const VERSION_MANAGER_DIRENV_STRATEGY: Record<string, string> = {
  vfox: 'use vfox in .envrc (direnv)',
  nvm: '.nvmrc file per context',
  fnm: '.node-version file per context',
  pyenv: '.python-version file per context',
  sdkman: '.sdkmanrc file per context',
  rbenv: '.ruby-version file per context',
  rvm: '.ruby-version file per context',
  rustup: 'rust-toolchain.toml per context',
};
```

**Apply:** Export `allToolMetadata` plus pure helpers: `getToolMetadata`, `getToolsByCategory`, `getToolsByPlatform`, Homebrew formula/cask lookup, config-path lookup, dotfile-path lookup, variant lookup, source lookup, and deterministic search. This module should not call filesystem APIs, Homebrew, `execa`, or Ink code.

---

### `src/plugins/first-party/browser/metadata.ts` (config, transform)

**Analog:** `src/plugins/first-party/ai-tools/index.ts`

**Imports pattern** (lines 12-13):
```typescript
import type { AIToolPlugin } from '../../api.js';
import { installFormula, installCask, isFormulaInstalled, isCaskInstalled } from '../../../utils/package-manager.js';
```

**Family catalog fields pattern** (lines 19-25, 46-59):
```typescript
abstract class BaseAIToolPlugin implements AIToolPlugin {
  readonly category = 'ai-tool' as const;
  abstract readonly name: string;
  abstract readonly label: string;
  abstract readonly variant: string;
  abstract readonly brewId: string;
  abstract readonly brewType: 'formula' | 'cask';
}

class ClaudeCodePlugin extends BaseAIToolPlugin {
  readonly name = 'claude-code';
  readonly label = 'Claude Code';
  readonly variant = 'cli-tool';
  readonly brewId = 'anthropics/tap/claude';
  readonly brewType = 'formula' as const;
}
```

**Family export pattern** (lines 87-97):
```typescript
export const AI_TOOL_PLUGINS: AIToolPlugin[] = [
  new ClaudeCodePlugin(),
  new ClaudeDesktopPlugin(),
  new CursorAIPlugin(),
  new WindsurfPlugin(),
  new GitHubCopilotCLIPlugin(),
];
```

**Browser source data to move** (from `src/steps/browser.tsx` lines 34-41):
```typescript
const KNOWN_BROWSERS: Omit<BrowserEntry, 'installed' | 'selected'>[] = [
  { id: 'safari',  label: 'Safari',          appPath: '/Applications/Safari.app',          defaultBrowserId: 'safari' },
  { id: 'chrome',  label: 'Google Chrome',   appPath: '/Applications/Google Chrome.app',   brewCask: 'google-chrome', defaultBrowserId: 'chrome' },
  { id: 'firefox', label: 'Firefox',         appPath: '/Applications/Firefox.app',         brewCask: 'firefox',        defaultBrowserId: 'firefox' },
  { id: 'arc',     label: 'Arc',             appPath: '/Applications/Arc.app',             brewCask: 'arc',            defaultBrowserId: 'arc' },
  { id: 'brave',   label: 'Brave Browser',   appPath: '/Applications/Brave Browser.app',   brewCask: 'brave-browser',  defaultBrowserId: 'brave' },
  { id: 'edge',    label: 'Microsoft Edge',  appPath: '/Applications/Microsoft Edge.app',  brewCask: 'microsoft-edge', defaultBrowserId: 'edge' },
];
```

**Apply:** Export a typed `browserToolMetadata: ToolMetadata[]` array. Include `id`, `label`, `category: 'browser'`, `supportedPlatforms: ['darwin']`, `install.appPath`, optional `install.homebrew.cask`, and `externalIds.defaultbrowser` or equivalent for `defaultBrowserId`.

---

### `src/plugins/first-party/browser/index.ts` (service, request-response)

**Analog:** `src/plugins/first-party/browser/index.ts`

**Imports pattern** (lines 10-13):
```typescript
import { access } from 'node:fs/promises';
import type { BrowserPlugin } from '../../api.js';
import { installCask, installFormula } from '../../../utils/package-manager.js';
import { execa } from 'execa';
```

**Service behavior pattern** (lines 19-57):
```typescript
abstract class BaseBrowserPlugin implements BrowserPlugin {
  readonly category = 'browser' as const;
  abstract readonly id: string;
  abstract readonly label: string;
  abstract readonly appPath: string;
  readonly brewCask: string | undefined;
  readonly defaultBrowserId: string;

  async detectInstalled(): Promise<boolean> {
    try {
      await access(this.appPath);
      return true;
    } catch {
      return false;
    }
  }

  async install(): Promise<void> {
    if (!this.brewCask) {
      throw new Error(`${this.label} cannot be installed via Homebrew (no cask defined)`);
    }
    await installCask(this.brewCask);
  }

  async setAsDefault(): Promise<void> {
    try {
      await installFormula('defaultbrowser');
    } catch {
      // May already be installed or offline — continue
    }
    await execa('defaultbrowser', [this.defaultBrowserId]);
  }
}
```

**Concrete browser values pattern** (lines 64-105):
```typescript
class SafariPlugin extends BaseBrowserPlugin {
  readonly id = 'safari';
  readonly label = 'Safari';
  readonly appPath = '/Applications/Safari.app';
  constructor() { super({ defaultBrowserId: 'safari' }); }
  async install(): Promise<void> { /* always installed */ }
}

class ChromePlugin extends BaseBrowserPlugin {
  readonly id = 'chrome';
  readonly label = 'Google Chrome';
  readonly appPath = '/Applications/Google Chrome.app';
  constructor() { super({ brewCask: 'google-chrome', defaultBrowserId: 'chrome' }); }
}
```

**Apply:** Keep behavior in this module. If refactoring to consume `browserToolMetadata`, preserve the same `BrowserPlugin` public fields and command behavior. Do not move `access`, `installCask`, `installFormula`, or `execa` into the metadata registry.

---

### `src/steps/browser.tsx` (component, event-driven)

**Analog:** `src/steps/ai-tools.tsx`

**Imports pattern** (lines 10-15):
```typescript
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import type { AIToolConfig } from '../config/schema.js';
import type { AIToolPlugin } from '../plugins/api.js';
import { AI_TOOL_PLUGINS } from '../plugins/first-party/ai-tools/index.js';
```

**Step state and registry-consumption pattern** (lines 33-68):
```typescript
export function AIToolsStep({ onComplete, onBack, isOptional, onSkip, initialValues = {} }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [tools, setTools] = useState<AIToolEntry[]>([]);
  const [cursorIdx, setCursorIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [skippedInstalls, setSkippedInstalls] = useState<string[]>([]);

  useEffect(() => {
    const savedNames = (initialValues.aiTools as Array<{ name: string }> | undefined)?.map(t => t.name);
    async function loadTools() {
      try {
        const entries: AIToolEntry[] = await Promise.all(
          AI_TOOL_PLUGINS.map(async (plugin) => {
            const installed = await plugin.detectInstalled().catch(() => false);
            return {
              plugin,
              installed,
              selected: savedNames ? savedNames.includes(plugin.name) : installed,
            };
          })
        );
        setTools(entries);
        setPhase('select');
      } catch (err) {
        setErrorMsg((err as Error).message);
        setTools(AI_TOOL_PLUGINS.map(plugin => ({
          plugin,
          installed: false,
          selected: savedNames ? savedNames.includes(plugin.name) : false,
        })));
        setPhase('select');
      }
    }
    loadTools().catch(() => {});
  }, []);
}
```

**Input/event pattern** (lines 70-80):
```typescript
useInput((input, key) => {
  if (phase === 'select') {
    if (key.upArrow) setCursorIdx(c => Math.max(0, c - 1));
    if (key.downArrow) setCursorIdx(c => Math.min(tools.length - 1, c + 1));
    if (input === ' ') {
      setTools(prev => prev.map((t, i) => i === cursorIdx ? { ...t, selected: !t.selected } : t));
    }
    if (key.return) { handleInstall().catch(() => {}); return; }
    if (input === 'b' && onBack) { onBack(); return; }
    if (input === 's' && isOptional && onSkip) { onSkip(); return; }
  }
});
```

**Install/complete pattern** (lines 83-113):
```typescript
async function handleInstall() {
  const toInstall = tools.filter(t => t.selected && !t.installed);
  if (toInstall.length === 0) {
    finishWithSelected();
    return;
  }

  setPhase('installing');
  const skipped: string[] = [];

  for (const entry of toInstall) {
    try {
      await entry.plugin.install();
    } catch {
      skipped.push(entry.plugin.label);
    }
  }

  setSkippedInstalls(skipped);
  finishWithSelected();
}
```

**Render pattern** (lines 142-171):
```typescript
return (
  <Box flexDirection="column">
    <Text bold>AI Coding Tools</Text>
    <Text dimColor>Space to select tools to install. Already-installed tools are pre-checked.</Text>
    {errorMsg && <Text color="yellow">⚠ Could not check install status (offline?): using defaults</Text>}
    <Box flexDirection="column" marginTop={1}>
      {tools.map((t, idx) => (
        <Box key={t.plugin.name}>
          <Text color={idx === cursorIdx ? 'cyan' : undefined}>
            {idx === cursorIdx ? '❯ ' : '  '}
            {t.selected ? '[x] ' : '[ ] '}
            <Text bold>{t.plugin.label}</Text>
            <Text dimColor> ({t.plugin.variant})</Text>
            {t.installed ? <Text color="green"> ✓</Text> : null}
          </Text>
        </Box>
      ))}
    </Box>
  </Box>
);
```

**Apply:** Replace step-local `KNOWN_BROWSERS` data with browser metadata-derived entries. Preserve the current `BrowserStep` phases, keyboard behavior, selected/default payload shape, and dynamic imports for filesystem/package-manager/execa boundaries.

---

### `tests/unit/tool-metadata.test.ts` (test, transform)

**Analog:** `tests/unit/ai-tools.test.ts`

**Test imports pattern** (lines 5-5):
```typescript
import { describe, it, expect, vi } from 'vitest';
```

**Catalog integrity pattern** (lines 16-60):
```typescript
describe('AI Tools curated list', () => {
  it('contains the expected 5 AI tools', () => {
    expect(EXPECTED_AI_TOOLS.length).toBe(5);
  });

  it('all tools have distinct names', () => {
    const names = EXPECTED_AI_TOOLS.map(t => t.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('all tools have a non-empty variant', () => {
    for (const tool of EXPECTED_AI_TOOLS) {
      expect(tool.variant).toBeTruthy();
    }
  });
});
```

**Schema safeParse pattern** (lines 63-85):
```typescript
describe('AIToolConfig schema', () => {
  it('AIToolConfig type has name, label, variant fields', async () => {
    const { AIToolConfigSchema } = await import('../../src/config/schema.js');
    const valid = AIToolConfigSchema.safeParse({
      name: 'claude-code',
      label: 'Claude Code',
      variant: 'cli-tool',
    });
    expect(valid.success).toBe(true);
  });

  it('AIToolConfig rejects missing name', async () => {
    const { AIToolConfigSchema } = await import('../../src/config/schema.js');
    const invalid = AIToolConfigSchema.safeParse({ label: 'Test', variant: 'cli' });
    expect(invalid.success).toBe(false);
  });
});
```

**Apply:** Import real metadata/registry exports instead of retyping expected catalogs. Add malformed fixtures inline in tests for required-field validation, uniqueness, lookup helpers, path matching, and deterministic search.

---

### `tests/unit/browser-plugins.test.ts` (test, request-response)

**Analog:** `tests/unit/browser-plugins.test.ts`

**Imports pattern** (lines 4-5):
```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { BROWSER_PLUGINS } from '../../src/plugins/first-party/browser/index.js';
```

**Metadata shape assertions** (lines 7-30):
```typescript
describe('BROWSER_PLUGINS', () => {
  it('contains 6 browser plugins', () => {
    expect(BROWSER_PLUGINS.length).toBe(6);
  });

  it('all plugins have the "browser" category', () => {
    for (const plugin of BROWSER_PLUGINS) {
      expect(plugin.category).toBe('browser');
    }
  });

  it('all plugins have non-empty id and label', () => {
    for (const plugin of BROWSER_PLUGINS) {
      expect(plugin.id).toBeTruthy();
      expect(plugin.label).toBeTruthy();
    }
  });
});
```

**Install identifier assertions** (lines 42-52):
```typescript
it('safari has no brewCask (always installed)', () => {
  const safari = BROWSER_PLUGINS.find(p => p.id === 'safari')!;
  expect(safari.brewCask).toBeUndefined();
});

it('all non-safari browsers have a brewCask', () => {
  const nonSafari = BROWSER_PLUGINS.filter(p => p.id !== 'safari');
  for (const plugin of nonSafari) {
    expect(plugin.brewCask).toBeTruthy();
  }
});
```

**Detection error handling pattern** (lines 70-82):
```typescript
it('returns false for a non-existent browser', async () => {
  const fakePlugin = {
    ...BROWSER_PLUGINS[0],
    appPath: '/Applications/NonExistentBrowser12345.app',
    async detectInstalled() {
      const { access } = await import('node:fs/promises');
      try { await access(this.appPath); return true; } catch { return false; }
    },
  };
  const result = await fakePlugin.detectInstalled();
  expect(result).toBe(false);
});
```

**Apply:** Preserve browser plugin behavior tests while adding assertions that plugin fields align with `browserToolMetadata`. Avoid real external command tests; mock package-manager and `execa` if testing install/default behavior.

---

### `tests/integration/wizard-flow.test.tsx` (test, event-driven)

**Analog:** `tests/integration/wizard-flow.test.tsx`

**Ink test imports and mocks** (lines 1-33):
```typescript
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    access: vi.fn().mockRejectedValue(new Error('ENOENT')),
  };
});
```

**Keyboard interaction pattern** (lines 59-74, 88-111):
```typescript
it('shell step renders options and calls onComplete on selection', async () => {
  const { ShellStep } = await import('../../src/steps/shell.js');
  const onComplete = vi.fn();
  
  const { lastFrame, stdin } = render(
    React.createElement(ShellStep, { onComplete })
  );

  expect(lastFrame()).toContain('zsh');
  
  stdin.write('\r');
  await new Promise(resolve => setTimeout(resolve, 50));
  
  expect(onComplete).toHaveBeenCalledWith({ shell: 'zsh' });
});
```

**Existing browser test to strengthen** (lines 113-127):
```typescript
it('browser step renders browser options', async () => {
  const { BrowserStep } = await import('../../src/steps/browser.js');
  const onComplete = vi.fn();
  const onSkip = vi.fn();

  const { lastFrame } = render(
    React.createElement(BrowserStep, { onComplete, isOptional: true, onSkip })
  );

  await new Promise(resolve => setTimeout(resolve, 200));
  const frame = lastFrame() ?? '';
  expect(typeof frame).toBe('string');
});
```

**Apply:** Update browser integration coverage to assert registry-derived labels (`Safari`, `Google Chrome`, etc.), selected/not-installed markers under mocked `access`, and completion payload after `stdin.write('\r')` plus default selection. Keep mocks hoisted before dynamic imports.

## Shared Patterns

### Plugin Category Boundaries
**Source:** `src/plugins/api.ts` lines 16-34, 97-140  
**Apply to:** `ToolMetadata` category typing and registry filters
```typescript
export type PluginCategory =
  | 'package-manager'
  | 'secrets-backend'
  | 'account-connector'
  | 'env-loader'
  | 'version-manager'
  | 'browser'
  | 'editor'
  | 'ai-tool';

export interface BrowserPlugin {
  readonly category: 'browser';
  readonly id: string;
  readonly label: string;
  readonly appPath: string;
  readonly brewCask?: string;
}

export interface AIToolPlugin {
  readonly category: 'ai-tool';
  readonly name: string;
  readonly label: string;
  readonly variant: string;
  readonly brewId: string;
  readonly brewType: 'formula' | 'cask';
}
```

### Do Not Broaden `PluginRegistry`
**Source:** `src/plugins/registry.ts` lines 1-23  
**Apply to:** `src/tools/registry.ts`, browser metadata, planner scope
```typescript
import type { TildePlugin, PluginCategory } from './api.js';

export class PluginRegistry {
  private plugins: Map<string, TildePlugin> = new Map();

  register(plugin: TildePlugin): void {
    const key = `${plugin.category}:${plugin.id}`;
    this.plugins.set(key, plugin);
  }

  get<T extends TildePlugin>(category: PluginCategory, id: string): T | undefined {
    const key = `${category}:${id}`;
    return this.plugins.get(key) as T | undefined;
  }
}
```

### Wizard Step Event Flow
**Source:** `src/steps/browser.tsx` lines 53-77, 92-131, 170-195  
**Apply to:** browser migration tests and refactor safety
```typescript
useEffect(() => {
  const savedIds = (initialValues.browser as { selected?: string[] } | undefined)?.selected;
  async function detectBrowsers() {
    const { access } = await import('node:fs/promises');
    const entries: BrowserEntry[] = await Promise.all(
      KNOWN_BROWSERS.map(async (b) => {
        let installed = false;
        try {
          await access(b.appPath);
          installed = true;
        } catch {
          // installed remains false
        }
        const selected = savedIds ? savedIds.includes(b.id) : installed;
        return { ...b, installed, selected };
      })
    );
    setBrowsers(entries);
    setPhase('select-browsers');
  }
  detectBrowsers().catch((err) => {
    setErrorMsg((err as Error).message);
    setPhase('error');
  });
}, []);
```

### External Command Safety
**Source:** `src/plugins/first-party/browser/index.ts` lines 41-57  
**Apply to:** browser plugin tests and registry boundary
```typescript
async install(): Promise<void> {
  if (!this.brewCask) {
    throw new Error(`${this.label} cannot be installed via Homebrew (no cask defined)`);
  }
  await installCask(this.brewCask);
}

async setAsDefault(): Promise<void> {
  try {
    await installFormula('defaultbrowser');
  } catch {
    // May already be installed or offline — continue
  }
  await execa('defaultbrowser', [this.defaultBrowserId]);
}
```

### Non-Plugin Catalog Shape
**Source:** `src/steps/tools.tsx` lines 15-45  
**Apply to:** future non-plugin metadata compatibility; optional Phase 1 examples only
```typescript
interface AppEntry {
  id: string;
  label: string;
  appPath: string;
  brewCask: string | null;
  installNote?: string;
  installed: boolean;
  selected: boolean;
}

const NOTE_TAKING_CATALOG: Omit<AppEntry, 'installed' | 'selected'>[] = [
  {
    id: 'obsidian',
    label: 'Obsidian',
    appPath: '/Applications/Obsidian.app',
    brewCask: 'obsidian',
  },
];
```

## No Analog Found

All inferred files have usable analogs. There is no existing aggregate `src/tools/registry.ts`; use `src/data/language-versions.ts` for static exported catalog style and `src/plugins/first-party/ai-tools/index.ts` for family-owned tool data.

## Metadata

**Analog search scope:** `src/plugins/first-party/`, `src/steps/`, `src/config/`, `src/data/`, `tests/unit/`, `tests/integration/`  
**Files scanned:** 12 primary files plus phase context/research/project instructions  
**Pattern extraction date:** 2026-06-13
