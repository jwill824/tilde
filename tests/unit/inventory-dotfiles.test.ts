import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { parseShellRcFindings, scanDotfileMap, type DotfileMap } from '../../src/inventory/dotfiles.js';
import type { InventoryWarning } from '../../src/inventory/report.js';

function fileByPath(map: DotfileMap, filePath: string) {
  return map.files.find(file => file.path === filePath);
}

const rcFixture = [
  'alias gs="git status"',
  'function workon() {',
  '  cd ~/work',
  '}',
  'export EDITOR=nvim',
  'export PATH="$HOME/bin:$PATH"',
  'export GH_TOKEN=ghp_secret',
  'export OP_REF=op://Personal/item/field',
  'export GENERATED="$(tool command)"',
  'source ~/.aliases',
  'eval "$(direnv hook zsh)"',
  'eval "$(vfox activate zsh)"',
  'eval "$(op signin)"',
  'eval "$(/opt/homebrew/bin/brew shellenv)"',
].join('\n');

describe('inventory dotfile scanner', () => {
  let tmpRoot: string;
  let tmpHome: string;
  let dotfilesRepo: string;
  let workspaceRoot: string;
  let warnings: InventoryWarning[];

  beforeEach(async () => {
    tmpRoot = join(tmpdir(), `tilde-dotfiles-test-${randomUUID()}`);
    tmpHome = join(tmpRoot, 'home');
    dotfilesRepo = join(tmpRoot, 'dotfiles');
    workspaceRoot = join(tmpRoot, 'workspace');
    warnings = [];

    await mkdir(join(tmpHome, '.config', 'nvim'), { recursive: true });
    await mkdir(join(tmpHome, '.obsidian'), { recursive: true });
    await mkdir(dotfilesRepo, { recursive: true });
    await mkdir(join(workspaceRoot, '.config', 'nvim', 'lua', 'plugins'), { recursive: true });

    await writeFile(join(tmpHome, '.config', 'nvim', 'init.lua'), '-- nvim\n');
    await writeFile(join(tmpHome, '.config', 'nvim', '.env.local'), 'TOKEN=secret\n');
    await writeFile(join(tmpHome, '.obsidian', 'app.json'), '{}\n');
    await writeFile(join(tmpHome, '.customrc'), 'set unknown=true\n');
    await writeFile(join(tmpHome, '.zshrc'), rcFixture);
    await writeFile(join(dotfilesRepo, '.gitconfig'), '[user]\n  name = Test\n');
    await writeFile(join(dotfilesRepo, '.env'), 'SECRET=true\n');
    await writeFile(join(workspaceRoot, '.config', 'nvim', 'init.lua'), '-- workspace nvim\n');
    await writeFile(join(workspaceRoot, '.config', 'nvim', 'id_rsa.key'), 'private\n');
    await writeFile(join(workspaceRoot, '.config', 'nvim', 'debug.log'), 'log\n');
    await writeFile(join(workspaceRoot, '.config', 'nvim', 'lua', 'plugins', 'nested.lua'), '-- nested\n');
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it('maps metadata-declared config and dotfile paths to known tool findings', async () => {
    const map = await scanDotfileMap({ homeDir: tmpHome, warnings });

    const nvimPath = join(tmpHome, '.config', 'nvim', 'init.lua');
    const obsidianPath = join(tmpHome, '.obsidian', 'app.json');
    const nvimFile = fileByPath(map, nvimPath);
    const obsidianFile = fileByPath(map, obsidianPath);

    expect(nvimFile).toEqual(expect.objectContaining({
      path: nvimPath,
      scope: 'home',
      state: 'known',
      toolIds: ['neovim'],
    }));
    expect(nvimFile?.findings).toEqual([
      expect.objectContaining({
        kind: 'metadata-path',
        classification: 'known',
        toolIds: ['neovim'],
        reason: 'config-path',
        confidence: 'high',
        safeDetails: expect.objectContaining({
          matchedPath: '~/.config/nvim',
          matchType: 'config-path',
        }),
      }),
    ]);

    expect(obsidianFile).toEqual(expect.objectContaining({
      path: obsidianPath,
      scope: 'home',
      state: 'known',
      toolIds: ['obsidian'],
    }));
    expect(obsidianFile?.findings).toEqual([
      expect.objectContaining({
        kind: 'metadata-path',
        classification: 'known',
        toolIds: ['obsidian'],
        reason: 'dotfile-path',
        confidence: 'high',
        safeDetails: expect.objectContaining({
          matchedPath: '~/.obsidian',
          matchType: 'dotfile-path',
        }),
      }),
    ]);

    expect(map.tools).toEqual(expect.arrayContaining([
      expect.objectContaining({
        toolId: 'neovim',
        knownFileCount: 1,
        findingCount: 1,
        paths: expect.arrayContaining([nvimPath]),
      }),
      expect.objectContaining({
        toolId: 'obsidian',
        knownFileCount: 1,
        findingCount: 1,
        paths: expect.arrayContaining([obsidianPath]),
      }),
    ]));
    expect(map.counts.knownFiles).toBeGreaterThanOrEqual(2);
  });

  it('scans home, dotfiles repo, and workspace candidates through bounded allowlists', async () => {
    const map = await scanDotfileMap({
      homeDir: tmpHome,
      dotfilesRepo,
      workspaceRoots: [workspaceRoot],
      warnings,
    });

    expect(fileByPath(map, join(tmpHome, '.customrc'))).toEqual(expect.objectContaining({
      scope: 'home',
      state: 'unknown',
    }));
    expect(fileByPath(map, join(dotfilesRepo, '.gitconfig'))).toEqual(expect.objectContaining({
      scope: 'dotfiles-repo',
      state: 'unknown',
    }));
    expect(fileByPath(map, join(workspaceRoot, '.config', 'nvim', 'init.lua'))).toEqual(expect.objectContaining({
      scope: 'workspace',
      state: 'known',
      toolIds: ['neovim'],
    }));
    expect(fileByPath(map, join(tmpHome, '.config', 'nvim', '.env.local'))).toBeUndefined();
    expect(fileByPath(map, join(dotfilesRepo, '.env'))).toBeUndefined();
    expect(fileByPath(map, join(workspaceRoot, '.config', 'nvim', 'id_rsa.key'))).toBeUndefined();
    expect(fileByPath(map, join(workspaceRoot, '.config', 'nvim', 'debug.log'))).toBeUndefined();
    expect(fileByPath(map, join(workspaceRoot, '.config', 'nvim', 'lua', 'plugins', 'nested.lua'))).toBeUndefined();
  });

  it('counts unknown files separately and treats missing or skipped candidates as non-fatal evidence', async () => {
    const symlinkPath = join(tmpHome, '.bashrc');
    await symlink(join(tmpHome, '.customrc'), symlinkPath);

    const map = await scanDotfileMap({
      homeDir: tmpHome,
      dotfilesRepo: join(tmpRoot, 'missing-dotfiles'),
      workspaceRoots: [join(tmpRoot, 'missing-workspace')],
      warnings,
    });

    expect(fileByPath(map, join(tmpHome, '.customrc'))).toEqual(expect.objectContaining({
      state: 'unknown',
      findings: [
        expect.objectContaining({
          kind: 'unknown',
          classification: 'unknown',
          toolIds: [],
          reason: 'unmatched-path',
        }),
      ],
    }));
    expect(map.counts.unknownFiles).toBeGreaterThanOrEqual(1);
    expect(fileByPath(map, symlinkPath)).toEqual(expect.objectContaining({
      state: 'skipped',
      warningIds: expect.arrayContaining([expect.stringMatching(/^dotfiles-/)]),
    }));
    expect(warnings).toEqual([
      expect.objectContaining({
        source: 'dotfiles',
        severity: 'warning',
        message: expect.stringContaining('Skipped symlink'),
      }),
    ]);
    expect(warnings[0]?.message).not.toContain(tmpHome);
  });

  it('parses shell rc files into safe structured findings without raw values', () => {
    const findings = parseShellRcFindings(join(tmpHome, '.zshrc'), rcFixture);
    const serialized = JSON.stringify(findings);

    expect(findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'alias',
        classification: 'unknown',
        safeDetails: expect.objectContaining({ name: 'gs' }),
      }),
      expect.objectContaining({
        kind: 'function',
        classification: 'unknown',
        safeDetails: expect.objectContaining({ name: 'workon' }),
      }),
      expect.objectContaining({
        kind: 'export',
        classification: 'unknown',
        safeDetails: expect.objectContaining({ name: 'EDITOR', valueKind: 'literal' }),
      }),
      expect.objectContaining({
        kind: 'path-edit',
        classification: 'unknown',
        safeDetails: expect.objectContaining({ name: 'PATH', valueKind: 'reference' }),
      }),
      expect.objectContaining({
        kind: 'export',
        classification: 'unknown',
        safeDetails: expect.objectContaining({ name: 'GH_TOKEN', valueKind: 'secret-like' }),
      }),
      expect.objectContaining({
        kind: 'export',
        classification: 'unknown',
        safeDetails: expect.objectContaining({ name: 'OP_REF', valueKind: 'secret-like' }),
      }),
      expect.objectContaining({
        kind: 'export',
        classification: 'unknown',
        safeDetails: expect.objectContaining({ name: 'GENERATED', valueKind: 'command-derived' }),
      }),
      expect.objectContaining({
        kind: 'source',
        classification: 'unknown',
        safeDetails: expect.objectContaining({ target: '~/.aliases' }),
      }),
      expect.objectContaining({
        kind: 'tool-init-hook',
        classification: 'known',
        toolIds: ['direnv'],
        safeDetails: expect.objectContaining({ toolId: 'direnv' }),
      }),
      expect.objectContaining({
        kind: 'tool-init-hook',
        classification: 'known',
        toolIds: ['vfox'],
        safeDetails: expect.objectContaining({ toolId: 'vfox' }),
      }),
      expect.objectContaining({
        kind: 'tool-init-hook',
        classification: 'known',
        toolIds: ['1password'],
        safeDetails: expect.objectContaining({ toolId: '1password' }),
      }),
      expect.objectContaining({
        kind: 'tool-init-hook',
        classification: 'known',
        toolIds: ['homebrew'],
        safeDetails: expect.objectContaining({ toolId: 'homebrew' }),
      }),
    ]));

    expect(serialized).not.toContain('git status');
    expect(serialized).not.toContain('cd ~/work');
    expect(serialized).not.toContain('nvim');
    expect(serialized).not.toContain('ghp_secret');
    expect(serialized).not.toContain('op://Personal/item/field');
    expect(serialized).not.toContain('tool command');
    expect(serialized).not.toContain('/opt/homebrew/bin/brew shellenv');
  });

  it('sanitizes source targets and only recognizes real eval hook forms', () => {
    const findings = parseShellRcFindings(join(tmpHome, '.zshrc'), [
      'source ~/.aliases; export TOKEN=plainsecret',
      '. "$HOME/.profile" && echo "$SECRET"',
      'source ~/.private # token hint',
      'source "$(secret command)"',
      'alias explain="echo run direnv hook zsh"',
      'echo "brew shellenv"',
      'eval "$(direnv hook zsh)"',
    ].join('\n'));
    const serialized = JSON.stringify(findings);

    expect(findings.filter(finding => finding.kind === 'tool-init-hook')).toEqual([
      expect.objectContaining({
        classification: 'known',
        toolIds: ['direnv'],
      }),
    ]);
    expect(serialized).not.toContain('plainsecret');
    expect(serialized).not.toContain('echo "$SECRET"');
    expect(serialized).not.toContain('token hint');
    expect(serialized).not.toContain('secret command');
    expect(serialized).not.toContain('echo run direnv hook zsh');
    expect(serialized).not.toContain('brew shellenv');
    expect(findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'source',
        safeDetails: expect.objectContaining({ sourceKind: 'command-derived' }),
      }),
      expect.objectContaining({
        kind: 'source',
        safeDetails: expect.objectContaining({ sourceKind: 'literal', target: '~/.private' }),
      }),
    ]));
  });

  it('integrates rc findings into dotfile map counts separately from path findings', async () => {
    const map = await scanDotfileMap({ homeDir: tmpHome, warnings });
    const zshrc = fileByPath(map, join(tmpHome, '.zshrc'));

    expect(zshrc).toEqual(expect.objectContaining({
      state: 'mixed',
      toolIds: ['1password', 'direnv', 'homebrew', 'vfox'],
      findings: expect.arrayContaining([
        expect.objectContaining({ kind: 'alias', classification: 'unknown' }),
        expect.objectContaining({ kind: 'function', classification: 'unknown' }),
        expect.objectContaining({ kind: 'source', classification: 'unknown' }),
        expect.objectContaining({ kind: 'tool-init-hook', classification: 'known', toolIds: ['direnv'] }),
      ]),
    }));
    expect(map.counts).toEqual(expect.objectContaining({
      knownFindingsCount: 4,
      unknownFindingsCount: expect.any(Number),
    }));
    expect((map.counts as { unknownFindingsCount?: number }).unknownFindingsCount).toBeGreaterThanOrEqual(8);

    const serialized = JSON.stringify(map);
    expect(serialized).not.toContain('ghp_secret');
    expect(serialized).not.toContain('op://Personal/item/field');
    expect(serialized).not.toContain('tool command');
  });
});
