import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

vi.mock('../../src/utils/exec.js', () => ({
  run: vi.fn().mockResolvedValue({ stdout: 'git\nnodejs\n', stderr: '', exitCode: 0 }),
}));

describe('capture/scanner', () => {
  let tmpHome: string;

  beforeEach(async () => {
    tmpHome = join(tmpdir(), `tilde-scanner-test-${randomUUID()}`);
    await mkdir(tmpHome, { recursive: true });
    await writeFile(join(tmpHome, '.zshrc'), 'alias gs="git status"\nexport PATH=/usr/local/bin\n');
    await writeFile(join(tmpHome, '.gitconfig'), '[user]\n  name = Test User\n  email = test@example.com\n');
    await writeFile(join(tmpHome, '.env'), 'SECRET=hunter2\n');
  });

  afterEach(async () => {
    await rm(tmpHome, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('scanDotfiles returns dotfiles including .zshrc, .gitconfig, and .env', async () => {
    const { scanDotfiles } = await import('../../src/capture/scanner.js');
    const files = await scanDotfiles(tmpHome);
    const basenames = files.map(f => f.split('/').pop());
    expect(basenames).toContain('.zshrc');
    expect(basenames).toContain('.gitconfig');
    expect(basenames).toContain('.env');
  });

  it('scanBrewPackages returns parsed package names from brew list', async () => {
    const { scanBrewPackages } = await import('../../src/capture/scanner.js');
    const packages = await scanBrewPackages();
    expect(packages).toContain('git');
    expect(packages).toContain('nodejs');
  });

  it('scanRcFiles reads .zshrc and .gitconfig content', async () => {
    const { scanRcFiles } = await import('../../src/capture/scanner.js');
    const paths = [
      join(tmpHome, '.zshrc'),
      join(tmpHome, '.gitconfig'),
      join(tmpHome, '.env'),
    ];
    const rcFiles = await scanRcFiles(paths);
    expect(rcFiles['.zshrc']).toContain('alias gs');
    expect(rcFiles['.gitconfig']).toContain('[user]');
    expect(rcFiles['.env']).toBeUndefined(); // .env is not in RC_FILE_NAMES
  });

  it('scanEnvironment assembles dotfiles, brew packages, and rc files', async () => {
    const { scanEnvironment } = await import('../../src/capture/scanner.js');
    const report = await scanEnvironment(tmpHome);
    expect(report.dotfiles.length).toBeGreaterThan(0);
    expect(report.brewPackages).toContain('git');
    expect(report.rcFiles['.zshrc']).toBeDefined();
    expect(report.skippedFiles).toEqual([]);
  });

  it('scanBrewPackages returns [] when brew is not available', async () => {
    const { run } = await import('../../src/utils/exec.js');
    vi.mocked(run).mockRejectedValueOnce(new Error('brew not found'));
    const { scanBrewPackages } = await import('../../src/capture/scanner.js');
    const packages = await scanBrewPackages();
    expect(packages).toEqual([]);
  });
});
