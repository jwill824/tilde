import { describe, it, expect } from 'vitest';
import { generateCdHook, hasCdHook } from '../../src/dotfiles/cd-hook.js';
import type { DeveloperContext } from '../../src/config/schema.js';

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
  github: { username: 'personal-gh' },
  authMethod: 'gh-cli',
  envVars: [],
};

const httpsCtx: DeveloperContext = {
  label: 'client',
  path: '~/Developer/client',
  git: { name: 'Client User', email: 'me@client.com' },
  authMethod: 'https',
  envVars: [],
};

describe('generateCdHook', () => {
  it('contains builtin cd "$@" call', () => {
    const result = generateCdHook([workCtx]);
    expect(result).toContain('builtin cd "$@"');
  });

  it('two gh-cli contexts → both path case patterns present', () => {
    const result = generateCdHook([workCtx, personalCtx]);
    expect(result).toContain('$HOME/Developer/work*');
    expect(result).toContain('$HOME/Developer/personal*');
  });

  it('each gh-cli context generates gh auth switch command', () => {
    const result = generateCdHook([workCtx, personalCtx]);
    expect(result).toContain('gh auth switch --user work-gh');
    expect(result).toContain('gh auth switch --user personal-gh');
  });

  it('non-gh-cli context (https) does not generate gh auth switch', () => {
    const result = generateCdHook([workCtx, httpsCtx]);
    expect(result).toContain('gh auth switch --user work-gh');
    expect(result).not.toContain('me@client.com');
    expect(result).not.toContain('$HOME/Developer/client*');
  });

  it('wraps output in tilde cd-hook markers', () => {
    const result = generateCdHook([workCtx]);
    expect(result).toContain('# --- tilde:cd-hook:begin ---');
    expect(result).toContain('# --- tilde:cd-hook:end ---');
  });

  it('returns empty string when no gh-cli contexts', () => {
    const result = generateCdHook([httpsCtx]);
    expect(result).toBe('');
  });
});

describe('hasCdHook', () => {
  it('returns true when marker is present', () => {
    const zshrc = 'some content\n# --- tilde:cd-hook:begin ---\nfunction cd() {}\n# --- tilde:cd-hook:end ---\n';
    expect(hasCdHook(zshrc)).toBe(true);
  });

  it('returns false when marker is absent', () => {
    const zshrc = 'some content\nexport PATH=$HOME/.local/bin:$PATH\n';
    expect(hasCdHook(zshrc)).toBe(false);
  });

  it('returns true for output of generateCdHook', () => {
    const hook = generateCdHook([workCtx]);
    expect(hasCdHook(hook)).toBe(true);
  });
});
