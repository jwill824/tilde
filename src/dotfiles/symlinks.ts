import { lstat, symlink, unlink, mkdir, readlink } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface SymlinkPair {
  src: string;   // source (in dotfiles repo)
  dest: string;  // destination (in home dir)
}

export interface SymlinkResult {
  src: string;
  dest: string;
  action: 'created' | 'skipped' | 'replaced' | 'error';
  error?: string;
}

export async function createSymlink(src: string, dest: string): Promise<SymlinkResult> {
  try {
    let destStat: Awaited<ReturnType<typeof lstat>> | null = null;
    try {
      destStat = await lstat(dest);
    } catch {
      // dest doesn't exist — that's fine
    }

    if (destStat) {
      if (destStat.isSymbolicLink()) {
        const currentTarget = await readlink(dest);
        if (currentTarget === src) {
          console.log(`already configured: ${dest}`);
          return { src, dest, action: 'skipped' };
        }
        // Wrong target — replace
        await unlink(dest);
      } else {
        // Regular file/dir — don't overwrite without user consent
        return { src, dest, action: 'skipped', error: 'Destination exists as a regular file' };
      }
    }

    await mkdir(dirname(dest), { recursive: true });
    await symlink(src, dest);
    return { src, dest, action: 'created' };
  } catch (err) {
    return { src, dest, action: 'error', error: (err as Error).message };
  }
}

export async function batchCreateSymlinks(pairs: SymlinkPair[]): Promise<SymlinkResult[]> {
  return Promise.all(pairs.map(p => createSymlink(p.src, p.dest)));
}
