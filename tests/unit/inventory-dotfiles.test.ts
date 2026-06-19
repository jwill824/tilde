import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { scanDotfileMap, type DotfileMap } from '../../src/inventory/dotfiles.js';
import type { InventoryWarning } from '../../src/inventory/report.js';

function fileByPath(map: DotfileMap, filePath: string) {
  return map.files.find(file => file.path === filePath);
}

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
    await writeFile(join(tmpHome, '.obsidian', 'app.json'), '{}\n');
    await writeFile(join(tmpHome, '.customrc'), 'set unknown=true\n');
    await writeFile(join(dotfilesRepo, '.gitconfig'), '[user]\n  name = Test\n');
    await writeFile(join(workspaceRoot, '.config', 'nvim', 'init.lua'), '-- workspace nvim\n');
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
    expect(fileByPath(map, join(workspaceRoot, '.config', 'nvim', 'lua', 'plugins', 'nested.lua'))).toBeUndefined();
  });

  it('counts unknown files separately and treats missing or skipped candidates as non-fatal evidence', async () => {
    const symlinkPath = join(tmpHome, '.zshrc');
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
  });
});
