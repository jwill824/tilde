import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { run } from '../utils/exec.js';
import type { TildeConfig } from '../config/schema.js';

function expandTilde(p: string): string {
  if (p.startsWith('~/')) return join(homedir(), p.slice(2));
  return p;
}

export async function applyOsDefaults(config: TildeConfig): Promise<void> {
  if (!config.configurations?.osDefaults) return;

  const repoPath = expandTilde(config.dotfilesRepo);
  const defaultsFile = join(repoPath, 'defaults.json');

  let entries: Array<{ domain: string; key: string; value: string | boolean | number }>;
  try {
    const raw = await readFile(defaultsFile, 'utf-8');
    entries = JSON.parse(raw);
  } catch {
    console.log('no defaults configured — skipping');
    return;
  }

  for (const entry of entries) {
    await run('defaults', ['write', entry.domain, entry.key, String(entry.value)]);
  }
}
