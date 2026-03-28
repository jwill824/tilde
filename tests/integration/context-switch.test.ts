import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { writeAll } from '../../src/dotfiles/writer.js';
import type { TildeConfig } from '../../src/config/schema.js';

describe('context-switch integration', () => {
  let testRoot: string;
  let dotfilesRepo: string;
  let workDir: string;
  let personalDir: string;

  beforeEach(async () => {
    testRoot = join(tmpdir(), `tilde-ctx-test-${randomUUID()}`);
    dotfilesRepo = join(testRoot, 'dotfiles');
    workDir = join(testRoot, 'work');
    personalDir = join(testRoot, 'personal');

    await mkdir(testRoot, { recursive: true });
    await mkdir(dotfilesRepo, { recursive: true });
    await mkdir(workDir, { recursive: true });
    await mkdir(personalDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testRoot, { recursive: true, force: true });
  });

  function buildConfig(): TildeConfig {
    return {
      $schema: 'https://tilde.sh/config-schema/v1.json',
      version: '1',
      os: 'macos',
      shell: 'zsh',
      packageManager: 'homebrew',
      versionManagers: [],
      languages: [],
      workspaceRoot: testRoot,
      dotfilesRepo,
      contexts: [
        {
          label: 'work',
          path: workDir,
          git: { name: 'Work User', email: 'work@company.com' },
          github: { username: 'work-gh' },
          authMethod: 'gh-cli',
          envVars: [],
        },
        {
          label: 'personal',
          path: personalDir,
          git: { name: 'Personal User', email: 'me@personal.com' },
          authMethod: 'ssh',
          envVars: [],
        },
      ],
      tools: [],
      configurations: { git: true, vscode: false, aliases: false, osDefaults: false, direnv: false },
      accounts: [],
      secretsBackend: '1password',
    };
  }

  it('global gitconfig contains two [includeIf] blocks', async () => {
    const config = buildConfig();
    await writeAll(config);

    const globalGitconfig = await readFile(join(dotfilesRepo, 'git/.gitconfig'), 'utf-8');
    expect(globalGitconfig).toContain(`[includeIf "gitdir:${workDir}/"]`);
    expect(globalGitconfig).toContain(`[includeIf "gitdir:${personalDir}/"]`);
  });

  it('each per-context gitconfig contains the correct email', async () => {
    const config = buildConfig();
    await writeAll(config);

    const workGitconfig = await readFile(join(dotfilesRepo, 'git/.gitconfig-work'), 'utf-8');
    const personalGitconfig = await readFile(join(dotfilesRepo, 'git/.gitconfig-personal'), 'utf-8');

    expect(workGitconfig).toContain('email = work@company.com');
    expect(workGitconfig).not.toContain('me@personal.com');

    expect(personalGitconfig).toContain('email = me@personal.com');
    expect(personalGitconfig).not.toContain('work@company.com');
  });

  it('[includeIf] blocks point to correct per-context gitconfig paths', async () => {
    const config = buildConfig();
    await writeAll(config);

    const globalGitconfig = await readFile(join(dotfilesRepo, 'git/.gitconfig'), 'utf-8');
    expect(globalGitconfig).toContain(`${dotfilesRepo}/git/.gitconfig-work`);
    expect(globalGitconfig).toContain(`${dotfilesRepo}/git/.gitconfig-personal`);
  });
});
