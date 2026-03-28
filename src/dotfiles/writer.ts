import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { createSymlink } from './symlinks.js';
import type { TildeConfig } from '../config/schema.js';
import { generateGlobalGitconfig, generateContextGitconfig } from './gitconfig.js';
import { generateZshrc } from './shellprofile.js';

function expandTilde(p: string): string {
  if (p.startsWith('~/')) return join(homedir(), p.slice(2));
  return p;
}

export async function writeManagedFile(
  dotfilesRepo: string,
  relativePath: string,
  content: string,
  homeDestRelative?: string
): Promise<void> {
  const repoPath = expandTilde(dotfilesRepo);
  const srcPath = join(repoPath, relativePath);
  await mkdir(dirname(srcPath), { recursive: true });
  await writeFile(srcPath, content, 'utf-8');

  if (homeDestRelative) {
    const destPath = join(homedir(), homeDestRelative);
    await createSymlink(srcPath, destPath);
  }
}

export async function writeAll(config: TildeConfig): Promise<void> {
  // 1. Global .gitconfig
  if (config.configurations.git) {
    const globalGitconfig = generateGlobalGitconfig(config);
    await writeManagedFile(config.dotfilesRepo, 'git/.gitconfig', globalGitconfig, '.gitconfig');

    // Per-context gitconfigs
    for (const ctx of config.contexts) {
      const contextGitconfig = generateContextGitconfig(ctx);
      await writeManagedFile(
        config.dotfilesRepo,
        `git/.gitconfig-${ctx.label}`,
        contextGitconfig
      );
    }
  }

  // 2. .zshrc
  if (config.shell === 'zsh') {
    const zshrc = generateZshrc(config, []);
    await writeManagedFile(config.dotfilesRepo, 'shell/.zshrc', zshrc, '.zshrc');
  }
}
