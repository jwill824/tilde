import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { run } from './exec.js';

const HOME = homedir();

export interface DetectedLanguage {
  name: string;
  version: string;
}

export interface DetectedVersionManager {
  name: string;
}

async function tryRun(cmd: string, args: string[], timeout = 500): Promise<string | null> {
  try {
    const result = await run(cmd, args, { timeout });
    return (result.stdout || result.stderr).trim();
  } catch {
    return null;
  }
}

function parseVersionLine(line: string): string {
  // Extract semver-like version from output
  const match = line.match(/(\d+\.\d+(?:\.\d+)?)/);
  return match ? match[1] : line.split(' ').pop() ?? line;
}

export async function detectLanguages(): Promise<DetectedLanguage[]> {
  const checks: Array<{ name: string; cmd: string; args: string[] }> = [
    { name: 'node',   cmd: 'node',    args: ['--version'] },
    { name: 'python', cmd: 'python3', args: ['--version'] },
    { name: 'go',     cmd: 'go',      args: ['version']   },
    { name: 'java',   cmd: 'java',    args: ['-version']  },
    { name: 'ruby',   cmd: 'ruby',    args: ['--version'] },
    { name: 'rust',   cmd: 'rustc',   args: ['--version'] },
  ];

  const results = await Promise.all(
    checks.map(async ({ name, cmd, args }) => {
      const out = await tryRun(cmd, args);
      if (!out) return null;
      return { name, version: parseVersionLine(out) };
    })
  );

  return results.filter((r): r is DetectedLanguage => r !== null);
}

export async function detectVersionManagers(): Promise<DetectedVersionManager[]> {
  const candidates: Array<{ name: string; check: () => boolean | Promise<boolean> }> = [
    { name: 'vfox',   check: () => tryRun('vfox', ['version']).then(Boolean) },
    { name: 'nvm',    check: () => existsSync(join(HOME, '.nvm')) },
    { name: 'fnm',    check: () => tryRun('fnm', ['--version']).then(Boolean) },
    { name: 'pyenv',  check: () => tryRun('pyenv', ['--version']).then(Boolean) },
    { name: 'sdkman', check: () => existsSync(join(HOME, '.sdkman')) },
    { name: 'rbenv',  check: () => tryRun('rbenv', ['--version']).then(Boolean) },
    { name: 'rustup', check: () => tryRun('rustup', ['--version']).then(Boolean) },
    { name: 'mise',   check: () => tryRun('mise', ['--version']).then(Boolean) },
  ];

  const results = await Promise.all(
    candidates.map(async ({ name, check }) => {
      const found = await check();
      return found ? { name } : null;
    })
  );

  return results.filter((r): r is DetectedVersionManager => r !== null);
}

export async function detectBrewLeaves(): Promise<string[]> {
  const out = await tryRun('brew', ['leaves'], 1500);
  if (!out) return [];
  return out.split('\n').map(s => s.trim()).filter(Boolean);
}

export interface DetectedDotfiles {
  present: string[];
  missing: string[];
}

export async function detectDotfiles(): Promise<DetectedDotfiles> {
  const candidates = [
    '~/.zshrc',
    '~/.bashrc',
    '~/.bash_profile',
    '~/.gitconfig',
    '~/.ssh/config',
    '~/.config',
  ].map(p => p.replace('~', HOME));

  const present: string[] = [];
  const missing: string[] = [];
  for (const p of candidates) {
    if (existsSync(p)) present.push(p.replace(HOME, '~'));
    else missing.push(p.replace(HOME, '~'));
  }
  return { present, missing };
}
