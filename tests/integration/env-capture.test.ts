import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

vi.mock('../../src/utils/exec.js', () => ({
  run: vi.fn().mockResolvedValue({ stdout: 'git\nnodejs\nnpm\n', stderr: '', exitCode: 0 }),
}));

describe('env-capture integration', () => {
  let tmpHome: string;

  beforeEach(async () => {
    tmpHome = join(tmpdir(), `tilde-capture-integration-${randomUUID()}`);
    await mkdir(tmpHome, { recursive: true });

    await writeFile(
      join(tmpHome, '.zshrc'),
      [
        "alias gs='git status'",
        "alias gc='git commit -m'",
        'export PATH=/usr/local/bin:$PATH',
        'export GH_TOKEN=ghp_supersecret',
        'source ~/.zshprofile',
      ].join('\n')
    );

    await writeFile(
      join(tmpHome, '.gitconfig'),
      [
        '[user]',
        '  name = Integration Tester',
        '  email = integration@example.com',
        '[includeIf "gitdir:~/Developer/work/"]',
        '  path = ~/.gitconfig-work',
      ].join('\n')
    );

    await writeFile(join(tmpHome, '.env'), 'SECRET_KEY=super-secret-value\n');
    await writeFile(join(tmpHome, '.zshprofile'), 'export NVM_DIR="$HOME/.nvm"\n');
  });

  afterEach(async () => {
    await rm(tmpHome, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('full capture flow: dotfiles detected, .env excluded, brew packages parsed, rc content readable', async () => {
    const { scanEnvironment } = await import('../../src/capture/scanner.js');
    const { createCaptureFilter, filterDotfiles } = await import('../../src/capture/filter.js');

    const report = await scanEnvironment(tmpHome);

    // Brew packages from mocked run()
    expect(report.brewPackages).toContain('git');
    expect(report.brewPackages).toContain('nodejs');
    expect(report.brewPackages).toContain('npm');

    // RC files are readable
    expect(report.rcFiles['.zshrc']).toContain("alias gs='git status'");
    expect(report.rcFiles['.gitconfig']).toContain('[user]');

    // Apply filter
    const filter = createCaptureFilter();
    const { included, excluded } = filterDotfiles(report.dotfiles, filter);

    // .zshrc and .gitconfig should be included
    const includedNames = included.map(f => f.split('/').pop());
    expect(includedNames).toContain('.zshrc');
    expect(includedNames).toContain('.gitconfig');
    expect(includedNames).toContain('.zshprofile');

    // .env should be excluded
    const excludedNames = excluded.map(f => f.split('/').pop());
    expect(excludedNames).toContain('.env');
  });

  it('rc parser extracts aliases and excludes secrets from .zshrc', async () => {
    const { scanEnvironment } = await import('../../src/capture/scanner.js');
    const { parseZshrc } = await import('../../src/capture/parser.js');

    const report = await scanEnvironment(tmpHome);
    const zshrcContent = report.rcFiles['.zshrc'] ?? '';
    const { aliases, exports, sourcedFiles } = parseZshrc(zshrcContent);

    expect(aliases['gs']).toBe('git status');
    expect(aliases['gc']).toBe('git commit -m');
    expect(exports['PATH']).toBeDefined();
    expect(exports['GH_TOKEN']).toBeUndefined(); // secret filtered
    expect(sourcedFiles).toContain('~/.zshprofile');
  });

  it('gitconfig parser extracts user identity and includeIf paths', async () => {
    const { scanEnvironment } = await import('../../src/capture/scanner.js');
    const { parseGitconfig, parseGitconfigIncludes } = await import('../../src/capture/parser.js');

    const report = await scanEnvironment(tmpHome);
    const gitconfigContent = report.rcFiles['.gitconfig'] ?? '';

    const { name, email } = parseGitconfig(gitconfigContent);
    expect(name).toBe('Integration Tester');
    expect(email).toBe('integration@example.com');

    const includePaths = parseGitconfigIncludes(gitconfigContent);
    expect(includePaths).toContain('~/.gitconfig-work');
  });
});
