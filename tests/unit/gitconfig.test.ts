import { describe, it, expect } from 'vitest';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  generateGlobalGitconfig,
  generateContextGitconfig,
  validateContextPaths,
} from '../../src/dotfiles/gitconfig.js';
import type { TildeConfig, DeveloperContext } from '../../src/config/schema.js';

const home = homedir();

const workCtx: DeveloperContext = {
  label: 'work',
  path: '~/Developer/work',
  git: { name: 'Work User', email: 'work@company.com' },
  github: { username: 'work-gh' },
  authMethod: 'gh-cli',
  envVars: [],
};

const personalCtx: DeveloperContext = {
  label: 'personal',
  path: '~/Developer/personal',
  git: { name: 'Personal User', email: 'me@personal.com' },
  authMethod: 'ssh',
  envVars: [],
};

const baseConfig: TildeConfig = {
  $schema: 'https://thingstead.io/tilde/config-schema/v1.json',
  version: '1',
  os: 'macos',
  shell: 'zsh',
  packageManagers: ['homebrew'],
  versionManagers: [],
  languages: [],
  workspaceRoot: '~/Developer',
  dotfilesRepo: '~/dotfiles',
  contexts: [workCtx, personalCtx],
  tools: [],
  configurations: { git: true, vscode: false, aliases: false, osDefaults: false, direnv: false },
  accounts: [],
  secretsBackend: '1password',
};

describe('generateGlobalGitconfig', () => {
  it('two contexts → two [includeIf "gitdir:..."] blocks', () => {
    const result = generateGlobalGitconfig(baseConfig);
    const workPath = join(home, 'Developer/work');
    const personalPath = join(home, 'Developer/personal');
    expect(result).toContain(`[includeIf "gitdir:${workPath}/"]`);
    expect(result).toContain(`[includeIf "gitdir:${personalPath}/"]`);
  });

  it('each includeIf block points to correct per-context gitconfig file', () => {
    const result = generateGlobalGitconfig(baseConfig);
    const dotfilesPath = join(home, 'dotfiles');
    expect(result).toContain(`${dotfilesPath}/git/.gitconfig-work`);
    expect(result).toContain(`${dotfilesPath}/git/.gitconfig-personal`);
  });
});

describe('generateContextGitconfig', () => {
  it('context gitconfig contains correct email for that context', () => {
    const workConfig = generateContextGitconfig(workCtx);
    expect(workConfig).toContain('email = work@company.com');
    expect(workConfig).toContain('name = Work User');
  });

  it('https context gitconfig contains credential helper', () => {
    const httpsCtx: DeveloperContext = { ...workCtx, label: 'client', authMethod: 'https' };
    const result = generateContextGitconfig(httpsCtx);
    expect(result).toContain('[credential]');
    expect(result).toContain('helper = osxkeychain');
  });

  it('ssh context gitconfig does not contain credential helper', () => {
    const result = generateContextGitconfig(personalCtx);
    expect(result).not.toContain('[credential]');
  });
});

describe('validateContextPaths', () => {
  it('non-overlapping paths → no throw', () => {
    expect(() => validateContextPaths([workCtx, personalCtx])).not.toThrow();
  });

  it('nested path (work/nested inside work) → throws', () => {
    const nestedCtx: DeveloperContext = {
      ...workCtx,
      label: 'nested',
      path: '~/Developer/work/nested',
    };
    expect(() => validateContextPaths([workCtx, nestedCtx])).toThrow(/overlap/i);
  });

  it('string-prefix overlap (work and work-client) → throws', () => {
    const workClientCtx: DeveloperContext = {
      ...workCtx,
      label: 'work-client',
      path: '~/Developer/work-client',
    };
    expect(() => validateContextPaths([workCtx, workClientCtx])).toThrow(/overlap/i);
  });

  it('single context → no throw', () => {
    expect(() => validateContextPaths([workCtx])).not.toThrow();
  });

  it('empty array → no throw', () => {
    expect(() => validateContextPaths([])).not.toThrow();
  });
});
