import { arch as osArch } from 'node:os';
import { basename } from 'node:path';
import { execa } from 'execa';

export interface EnvironmentSnapshot {
  /** Full OS description, e.g. "macOS Sonoma 14.5" */
  os: string;
  /** CPU architecture: "arm64" | "x64" | "unknown" */
  arch: string;
  /** Shell name, e.g. "zsh" */
  shellName: string;
  /** Shell version, e.g. "5.9" — undefined when detection fails */
  shellVersion?: string;
  /** tilde application version */
  tildeVersion: string;
}

/** Map of macOS major version → friendly name */
const OS_NAME_MAP: Record<number, string> = {
  13: 'Ventura',
  14: 'Sonoma',
  15: 'Sequoia',
};

/**
 * Detect macOS product version string via `sw_vers -productVersion`.
 * Falls back to "unknown" on any error.
 */
export async function detectOsVersion(): Promise<string> {
  try {
    const result = await execa('sw_vers', ['-productVersion'], { timeout: 3000 });
    const trimmed = result.stdout.trim();
    return trimmed || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Map a macOS version string to a human-friendly name.
 * e.g. "14.5" → "macOS Sonoma", "16.0" → "macOS 16.0"
 */
export function detectOsName(version: string): string {
  const major = parseInt(version.split('.')[0] ?? '', 10);
  const name = isNaN(major) ? undefined : OS_NAME_MAP[major];
  return name ? `macOS ${name}` : `macOS ${version}`;
}

/**
 * Returns the CPU architecture.
 * Maps "x64" through; passes "arm64" through; falls back to "unknown".
 */
export function detectArch(): string {
  const arch = osArch();
  if (arch === 'x64' || arch === 'arm64') return arch;
  return 'unknown';
}

/**
 * Returns the basename of `process.env.SHELL`, e.g. "zsh".
 * Falls back to "unknown" when $SHELL is not set.
 */
export function detectShellName(): string {
  const shellPath = process.env['SHELL'];
  if (!shellPath) return 'unknown';
  return basename(shellPath);
}

/**
 * Runs `shellPath --version` and parses the first-line version number.
 * Returns `undefined` on any failure or when no version can be parsed.
 */
export async function detectShellVersion(shellPath: string): Promise<string | undefined> {
  try {
    const result = await execa(shellPath, ['--version'], { timeout: 3000 });
    const firstLine = result.stdout.split('\n')[0] ?? '';
    const match = firstLine.match(/(\d+\.\d+[\.\d]*)/);
    return match?.[1];
  } catch {
    return undefined;
  }
}

/**
 * Capture a full environment snapshot in parallel.
 * All detection failures fall back gracefully — never throws.
 */
export async function captureEnvironment(tildeVersion: string): Promise<EnvironmentSnapshot> {
  const shellPath = process.env['SHELL'] ?? '';
  const shellName = detectShellName();
  const arch = detectArch();

  const [osVersion, shellVersion] = await Promise.all([
    detectOsVersion(),
    shellPath ? detectShellVersion(shellPath) : Promise.resolve(undefined),
  ]);

  const osName = detectOsName(osVersion);
  // For mapped versions (Ventura/Sonoma/Sequoia), osName is "macOS {Name}" — append the numeric version.
  // For unmapped versions, osName is already "macOS {version}" — don't duplicate.
  const knownNames = Object.values({ 13: 'Ventura', 14: 'Sonoma', 15: 'Sequoia' });
  const isMapped = knownNames.some(n => osName.includes(n));
  const os = (osVersion !== 'unknown' && isMapped) ? `${osName} ${osVersion}` : osName;

  return { os, arch, shellName, shellVersion, tildeVersion };
}
