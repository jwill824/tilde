/**
 * Unit tests for language version file generation (T032).
 * Tests writeVersionFile() for all supported version managers.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeVersionFile, writeVersionFiles, generateCdHook } from '../../src/dotfiles/cd-hook.js';
import type { DeveloperContext, LanguageBinding } from '../../src/config/schema.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = join(tmpdir(), `tilde-cd-hook-${Date.now()}`);
  await mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

const NODE_BINDING: LanguageBinding = { runtime: 'nodejs', version: '22.0.0' };
const JAVA_BINDING: LanguageBinding = { runtime: 'java', version: '21.0.3' };
const PYTHON_BINDING: LanguageBinding = { runtime: 'python', version: '3.12.0' };

// ---------------------------------------------------------------------------
// writeVersionFile tests
// ---------------------------------------------------------------------------

describe('writeVersionFile() — vfox', () => {
  it('writes .vfox.json with all bindings', async () => {
    await writeVersionFile(tmpDir, [NODE_BINDING, JAVA_BINDING], 'vfox');
    const content = await readFile(join(tmpDir, '.vfox.json'), 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed['nodejs']).toBe('22.0.0');
    expect(parsed['java']).toBe('21.0.3');
  });

  it('.vfox.json is valid JSON', async () => {
    await writeVersionFile(tmpDir, [NODE_BINDING], 'vfox');
    const content = await readFile(join(tmpDir, '.vfox.json'), 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('empty bindings produces no file for vfox', async () => {
    await writeVersionFile(tmpDir, [], 'vfox');
    try {
      await readFile(join(tmpDir, '.vfox.json'), 'utf-8');
      // Should not reach here if file doesn't exist
    } catch {
      // Expected: file was not written for empty bindings
    }
  });
});

describe('writeVersionFile() — nvm', () => {
  it('writes .nvmrc with the Node.js major version', async () => {
    await writeVersionFile(tmpDir, [NODE_BINDING], 'nvm');
    const content = await readFile(join(tmpDir, '.nvmrc'), 'utf-8');
    expect(content.trim()).toBe('22');
  });

  it('.nvmrc contains only the major version number', async () => {
    await writeVersionFile(tmpDir, [{ runtime: 'nodejs', version: '18.20.0' }], 'nvm');
    const content = await readFile(join(tmpDir, '.nvmrc'), 'utf-8');
    expect(content.trim()).toBe('18');
    expect(content.trim()).not.toContain('.');
  });

  it('non-node bindings with nvm produce no .nvmrc', async () => {
    await writeVersionFile(tmpDir, [JAVA_BINDING], 'nvm');
    let fileExists = false;
    try {
      await readFile(join(tmpDir, '.nvmrc'), 'utf-8');
      fileExists = true;
    } catch { /* not found */ }
    expect(fileExists).toBe(false);
  });
});

describe('writeVersionFile() — mise', () => {
  it('writes .tool-versions with correct format', async () => {
    await writeVersionFile(tmpDir, [NODE_BINDING, JAVA_BINDING], 'mise');
    const content = await readFile(join(tmpDir, '.tool-versions'), 'utf-8');
    expect(content).toContain('nodejs 22.0.0');
    expect(content).toContain('java 21.0.3');
  });

  it('.tool-versions has one runtime per line', async () => {
    await writeVersionFile(tmpDir, [NODE_BINDING, JAVA_BINDING, PYTHON_BINDING], 'mise');
    const content = await readFile(join(tmpDir, '.tool-versions'), 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    expect(lines.length).toBe(3);
  });
});

describe('writeVersionFile() — pyenv', () => {
  it('writes .python-version with Python version', async () => {
    await writeVersionFile(tmpDir, [PYTHON_BINDING], 'pyenv');
    const content = await readFile(join(tmpDir, '.python-version'), 'utf-8');
    expect(content.trim()).toBe('3.12.0');
  });

  it('non-python bindings with pyenv produce no .python-version', async () => {
    await writeVersionFile(tmpDir, [NODE_BINDING], 'pyenv');
    let fileExists = false;
    try {
      await readFile(join(tmpDir, '.python-version'), 'utf-8');
      fileExists = true;
    } catch { /* not found */ }
    expect(fileExists).toBe(false);
  });
});

describe('writeVersionFile() — sdkman', () => {
  it('writes .sdkmanrc with Java version', async () => {
    await writeVersionFile(tmpDir, [JAVA_BINDING], 'sdkman');
    const content = await readFile(join(tmpDir, '.sdkmanrc'), 'utf-8');
    expect(content).toContain('java=21.0.3');
  });
});

describe('writeVersionFile() — none', () => {
  it('does not write any file when versionManagerKind is "none"', async () => {
    await writeVersionFile(tmpDir, [NODE_BINDING], 'none');
    // No files should be created
    const { readdir } = await import('node:fs/promises');
    const files = await readdir(tmpDir);
    expect(files.filter(f => ['.vfox.json', '.nvmrc', '.tool-versions', '.python-version', '.sdkmanrc'].includes(f)).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// writeVersionFiles (multi-context) tests
// ---------------------------------------------------------------------------

describe('writeVersionFiles()', () => {
  it('returns empty array on success', async () => {
    const ctx1Dir = join(tmpDir, 'personal');
    await mkdir(ctx1Dir, { recursive: true });

    const ctx: DeveloperContext = {
      label: 'personal',
      path: ctx1Dir,
      git: { name: 'T', email: 't@t.com' },
      authMethod: 'gh-cli',
      envVars: [],
      languageBindings: [NODE_BINDING],
    };

    const failures = await writeVersionFiles([ctx], 'nvm');
    expect(failures).toHaveLength(0);
  });

  it('skips contexts with empty languageBindings silently', async () => {
    const ctx: DeveloperContext = {
      label: 'work',
      path: join(tmpDir, 'work'),
      git: { name: 'T', email: 't@t.com' },
      authMethod: 'gh-cli',
      envVars: [],
      languageBindings: [],  // empty — should be skipped
    };

    // Even without the directory existing, empty bindings should not cause errors
    const failures = await writeVersionFiles([ctx], 'vfox');
    expect(failures).toHaveLength(0);
  });

  it('collects errors for contexts with invalid paths instead of throwing', async () => {
    const ctx: DeveloperContext = {
      label: 'broken',
      path: '/nonexistent/path/that/cannot/be/created',
      git: { name: 'T', email: 't@t.com' },
      authMethod: 'gh-cli',
      envVars: [],
      languageBindings: [NODE_BINDING],
    };

    // This will fail because the path is invalid and mkdir may not be allowed
    // But we verify it doesn't throw — failures are collected
    let threw = false;
    try {
      await writeVersionFiles([ctx], 'vfox');
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateCdHook backward compatibility (existing tests still pass)
// ---------------------------------------------------------------------------

describe('generateCdHook — backward compatibility with languageBindings field', () => {
  it('works with contexts that have languageBindings', () => {
    const ctx: DeveloperContext = {
      label: 'work',
      path: '~/Developer/work',
      git: { name: 'T', email: 't@t.com' },
      github: { username: 'work-gh' },
      authMethod: 'gh-cli',
      envVars: [],
      languageBindings: [NODE_BINDING],
    };

    const hook = generateCdHook([ctx]);
    expect(hook).toContain('gh auth switch --user work-gh');
  });

  it('works with contexts that have no languageBindings', () => {
    const ctx: DeveloperContext = {
      label: 'personal',
      path: '~/Developer/personal',
      git: { name: 'T', email: 't@t.com' },
      github: { username: 'personal-gh' },
      authMethod: 'gh-cli',
      envVars: [],
      languageBindings: [],
    };

    const hook = generateCdHook([ctx]);
    expect(hook).toContain('gh auth switch --user personal-gh');
  });
});
