/**
 * Integration tests for language version activation on context switch.
 *
 * Required by constitution Dev Workflow §362 — T030/T031 modify writeVersionFiles()
 * in src/dotfiles/cd-hook.ts and must be covered by integration tests (not just unit
 * tests) that exercise real file I/O against temporary directories.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import {
  writeVersionFiles,
  writeVersionFile,
  type VersionManagerKind,
} from '../../src/dotfiles/cd-hook.js';
import type { DeveloperContext } from '../../src/config/schema.js';

describe('context-switching language version activation', () => {
  let testRoot: string;
  let personalDir: string;
  let workDir: string;

  beforeEach(async () => {
    testRoot = join(tmpdir(), `tilde-version-test-${randomUUID()}`);
    personalDir = join(testRoot, 'personal');
    workDir = join(testRoot, 'work');
    await mkdir(personalDir, { recursive: true });
    await mkdir(workDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testRoot, { recursive: true, force: true });
  });

  // ---------------------------------------------------------------------------
  // Scenario 1: cd to personal context (Node 22 binding) → .nvmrc contains "22"
  // ---------------------------------------------------------------------------
  it('writes .nvmrc with major version when cd to personal context (nvm)', async () => {
    const contexts: DeveloperContext[] = [
      {
        label: 'personal',
        path: personalDir,
        git: { name: 'Personal User', email: 'me@personal.com' },
        authMethod: 'ssh',
        envVars: [],
        languageBindings: [{ runtime: 'nodejs', version: '22.0.0' }],
      },
    ];

    await writeVersionFiles(contexts, 'nvm');

    const nvmrc = await readFile(join(personalDir, '.nvmrc'), 'utf-8');
    expect(nvmrc.trim()).toBe('22');
  });

  // ---------------------------------------------------------------------------
  // Scenario 2: cd to work context (Java 21 + Node 18 bindings) → .tool-versions
  // ---------------------------------------------------------------------------
  it('writes .tool-versions with all bindings when cd to work context (mise)', async () => {
    const contexts: DeveloperContext[] = [
      {
        label: 'work',
        path: workDir,
        git: { name: 'Work User', email: 'work@company.com' },
        authMethod: 'gh-cli',
        envVars: [],
        languageBindings: [
          { runtime: 'java', version: '21.0.3' },
          { runtime: 'nodejs', version: '18.20.0' },
        ],
      },
    ];

    await writeVersionFiles(contexts, 'mise');

    const toolVersions = await readFile(join(workDir, '.tool-versions'), 'utf-8');
    expect(toolVersions).toContain('java 21.0.3');
    expect(toolVersions).toContain('nodejs 18.20.0');
  });

  // ---------------------------------------------------------------------------
  // Scenario 3: context with no bindings activates cleanly — no version files written
  // ---------------------------------------------------------------------------
  it('does not write any version files when context has no languageBindings', async () => {
    const contexts: DeveloperContext[] = [
      {
        label: 'personal',
        path: personalDir,
        git: { name: 'Personal User', email: 'me@personal.com' },
        authMethod: 'ssh',
        envVars: [],
        languageBindings: [],
      },
    ];

    const failures = await writeVersionFiles(contexts, 'nvm');

    expect(failures).toHaveLength(0);

    // No version file should have been created
    const dirContents = await import('node:fs/promises').then(fs =>
      fs.readdir(personalDir)
    );
    expect(dirContents).not.toContain('.nvmrc');
    expect(dirContents).not.toContain('.tool-versions');
    expect(dirContents).not.toContain('.vfox.json');
  });

  // ---------------------------------------------------------------------------
  // Scenario 4: idempotent overwrite when context re-activated with different version
  // ---------------------------------------------------------------------------
  it('overwrites existing version file idempotently on re-activation', async () => {
    // First activation — Node 20
    await writeVersionFile(personalDir, [{ runtime: 'nodejs', version: '20.0.0' }], 'nvm');
    const firstWrite = await readFile(join(personalDir, '.nvmrc'), 'utf-8');
    expect(firstWrite.trim()).toBe('20');

    // Re-activation with updated binding — Node 22
    await writeVersionFile(personalDir, [{ runtime: 'nodejs', version: '22.0.0' }], 'nvm');
    const secondWrite = await readFile(join(personalDir, '.nvmrc'), 'utf-8');
    expect(secondWrite.trim()).toBe('22');
  });

  // ---------------------------------------------------------------------------
  // Scenario 5: vfox JSON format for multi-runtime context
  // ---------------------------------------------------------------------------
  it('writes .vfox.json with all runtime bindings for vfox manager', async () => {
    await writeVersionFile(
      workDir,
      [
        { runtime: 'nodejs', version: '18.20.0' },
        { runtime: 'java', version: '21.0.3' },
      ],
      'vfox',
    );

    const raw = await readFile(join(workDir, '.vfox.json'), 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, string>;
    expect(parsed.nodejs).toBe('18.20.0');
    expect(parsed.java).toBe('21.0.3');
  });

  // ---------------------------------------------------------------------------
  // Scenario 6: multiple contexts processed in one pass — each gets its own file
  // ---------------------------------------------------------------------------
  it('processes multiple contexts independently in a single writeVersionFiles call', async () => {
    const contexts: DeveloperContext[] = [
      {
        label: 'personal',
        path: personalDir,
        git: { name: 'Personal User', email: 'me@personal.com' },
        authMethod: 'ssh',
        envVars: [],
        languageBindings: [{ runtime: 'nodejs', version: '22.0.0' }],
      },
      {
        label: 'work',
        path: workDir,
        git: { name: 'Work User', email: 'work@company.com' },
        authMethod: 'gh-cli',
        envVars: [],
        languageBindings: [
          { runtime: 'java', version: '21.0.3' },
          { runtime: 'nodejs', version: '18.20.0' },
        ],
      },
    ];

    const failures = await writeVersionFiles(contexts, 'mise');
    expect(failures).toHaveLength(0);

    const personalVersions = await readFile(join(personalDir, '.tool-versions'), 'utf-8');
    expect(personalVersions).toContain('nodejs 22.0.0');
    expect(personalVersions).not.toContain('java');

    const workVersions = await readFile(join(workDir, '.tool-versions'), 'utf-8');
    expect(workVersions).toContain('java 21.0.3');
    expect(workVersions).toContain('nodejs 18.20.0');
  });
});
