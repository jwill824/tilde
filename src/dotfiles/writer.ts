import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { createSymlink } from './symlinks.js';
import type { TildeConfig } from '../config/schema.js';
import { generateGlobalGitconfig, generateContextGitconfig } from './gitconfig.js';
import { generateZshrc, generateBashProfile, generateFishConfig } from './shellprofile.js';

function expandTilde(p: string): string {
  if (p.startsWith('~/')) return join(homedir(), p.slice(2));
  return p;
}

export async function writeManagedFile(
  dotfilesRepo: string,
  relativePath: string,
  content: string,
  homeDestRelative?: string,
  opts?: { dryRun?: boolean }
): Promise<void> {
  const repoPath = expandTilde(dotfilesRepo);
  const srcPath = join(repoPath, relativePath);

  if (opts?.dryRun) {
    console.log(`[dry-run] would write: ${srcPath}`);
    if (homeDestRelative) {
      const destPath = join(homedir(), homeDestRelative);
      console.log(`[dry-run] would symlink: ${srcPath} → ${destPath}`);
    }
    return;
  }

  // Idempotency: skip write if content already matches
  try {
    const existing = await readFile(srcPath, 'utf-8');
    if (existing === content) {
      console.log(`already configured: ${srcPath}`);
      if (homeDestRelative) {
        const destPath = join(homedir(), homeDestRelative);
        await createSymlink(srcPath, destPath);
      }
      return;
    }
  } catch {
    // File doesn't exist yet — proceed with write
  }

  await mkdir(dirname(srcPath), { recursive: true });
  await writeFile(srcPath, content, 'utf-8');

  if (homeDestRelative) {
    const destPath = join(homedir(), homeDestRelative);
    await createSymlink(srcPath, destPath);
  }
}

export async function writeAll(config: TildeConfig, opts?: { dryRun?: boolean }): Promise<void> {
  // 1. Global .gitconfig
  if (config.configurations.git) {
    const globalGitconfig = generateGlobalGitconfig(config);
    await writeManagedFile(config.dotfilesRepo, 'git/.gitconfig', globalGitconfig, '.gitconfig', opts);

    // Per-context gitconfigs
    for (const ctx of config.contexts) {
      const contextGitconfig = generateContextGitconfig(ctx);
      await writeManagedFile(
        config.dotfilesRepo,
        `git/.gitconfig-${ctx.label}`,
        contextGitconfig,
        undefined,
        opts
      );
    }
  }

  // 2. Shell profile
  if (config.shell === 'zsh') {
    const zshrc = generateZshrc(config, []);
    await writeManagedFile(config.dotfilesRepo, 'shell/.zshrc', zshrc, '.zshrc', opts);
  } else if (config.shell === 'bash') {
    const bashProfile = generateBashProfile(config, []);
    await writeManagedFile(config.dotfilesRepo, 'shell/.bash_profile', bashProfile, '.bash_profile', opts);
  } else if (config.shell === 'fish') {
    const fishConfig = generateFishConfig(config, []);
    await writeManagedFile(config.dotfilesRepo, 'shell/config.fish', fishConfig, '.config/fish/config.fish', opts);
  }
}
