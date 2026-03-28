import { describe, it, expect } from 'vitest';
import { parseZshrc, parseGitconfig, parseGitconfigIncludes } from '../../src/capture/parser.js';

describe('capture/parser', () => {
  describe('parseZshrc', () => {
    it('parses alias with single quotes', () => {
      const { aliases } = parseZshrc("alias gs='git status'");
      expect(aliases['gs']).toBe('git status');
    });

    it('parses alias with double quotes', () => {
      const { aliases } = parseZshrc('alias gc="git commit"');
      expect(aliases['gc']).toBe('git commit');
    });

    it('parses alias without quotes', () => {
      const { aliases } = parseZshrc('alias ll=ls');
      expect(aliases['ll']).toBe('ls');
    });

    it('parses export PATH', () => {
      const { exports } = parseZshrc('export PATH=/usr/local/bin');
      expect(exports['PATH']).toBe('/usr/local/bin');
    });

    it('excludes export with GitHub token value', () => {
      const { exports } = parseZshrc('export GH_TOKEN=ghp_abc123');
      expect(exports['GH_TOKEN']).toBeUndefined();
    });

    it('excludes export with sk- (OpenAI) secret', () => {
      const { exports } = parseZshrc('export OPENAI_KEY=sk-abc123');
      expect(exports['OPENAI_KEY']).toBeUndefined();
    });

    it('excludes export with AWS AKIA key', () => {
      const { exports } = parseZshrc('export AWS_KEY=AKIAabc123');
      expect(exports['AWS_KEY']).toBeUndefined();
    });

    it('extracts source lines', () => {
      const { sourcedFiles } = parseZshrc('source ~/.zshprofile');
      expect(sourcedFiles).toContain('~/.zshprofile');
    });

    it('extracts . (dot) source lines', () => {
      const { sourcedFiles } = parseZshrc('. ~/.zshprofile');
      expect(sourcedFiles).toContain('~/.zshprofile');
    });

    it('ignores commented lines', () => {
      const { aliases, exports } = parseZshrc('# alias gs="git status"\n# export PATH=/foo');
      expect(Object.keys(aliases)).toHaveLength(0);
      expect(Object.keys(exports)).toHaveLength(0);
    });

    it('parses a full .zshrc with multiple entries', () => {
      const content = [
        '# My zshrc',
        "alias gs='git status'",
        "alias gc='git commit'",
        'export PATH=/usr/local/bin',
        'export GH_TOKEN=ghp_abc123',
        'source ~/.zshprofile',
      ].join('\n');
      const { aliases, exports, sourcedFiles } = parseZshrc(content);
      expect(Object.keys(aliases)).toHaveLength(2);
      expect(aliases['gs']).toBe('git status');
      expect(Object.keys(exports)).toHaveLength(1);
      expect(exports['PATH']).toBe('/usr/local/bin');
      expect(exports['GH_TOKEN']).toBeUndefined();
      expect(sourcedFiles).toContain('~/.zshprofile');
    });
  });

  describe('parseGitconfig', () => {
    it('parses name and email from [user] section', () => {
      const content = '[user]\n  name = Jeff Williams\n  email = jeff@example.com\n';
      const { name, email } = parseGitconfig(content);
      expect(name).toBe('Jeff Williams');
      expect(email).toBe('jeff@example.com');
    });

    it('returns undefined when [user] section is missing', () => {
      const content = '[core]\n  autocrlf = false\n';
      const { name, email } = parseGitconfig(content);
      expect(name).toBeUndefined();
      expect(email).toBeUndefined();
    });

    it('ignores entries outside [user] section', () => {
      const content = '[core]\n  name = Not Jeff\n[user]\n  name = Jeff Williams\n  email = jeff@example.com\n';
      const { name } = parseGitconfig(content);
      expect(name).toBe('Jeff Williams');
    });
  });

  describe('parseGitconfigIncludes', () => {
    it('parses path from [includeIf] section', () => {
      const content = '[includeIf "gitdir:~/Developer/work/"]\n  path = ~/.gitconfig-work\n';
      const paths = parseGitconfigIncludes(content);
      expect(paths).toContain('~/.gitconfig-work');
    });

    it('returns empty array when no [includeIf] sections exist', () => {
      const content = '[user]\n  name = Jeff Williams\n';
      const paths = parseGitconfigIncludes(content);
      expect(paths).toHaveLength(0);
    });

    it('parses multiple [includeIf] sections', () => {
      const content = [
        '[includeIf "gitdir:~/Developer/work/"]',
        '  path = ~/.gitconfig-work',
        '[includeIf "gitdir:~/Developer/personal/"]',
        '  path = ~/.gitconfig-personal',
      ].join('\n');
      const paths = parseGitconfigIncludes(content);
      expect(paths).toHaveLength(2);
      expect(paths).toContain('~/.gitconfig-work');
      expect(paths).toContain('~/.gitconfig-personal');
    });
  });
});
