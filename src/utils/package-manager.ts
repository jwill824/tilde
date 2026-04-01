/**
 * Homebrew package manager helpers.
 *
 * All functions wrap the `brew` CLI. They are designed to be called from
 * wizard steps and plugin `install()` methods. Network errors are allowed
 * to propagate so callers can display offline-resilience messaging.
 */

import { execa } from 'execa';

/**
 * Run a `brew` subcommand and return stdout as a string.
 * Throws if brew exits with a non-zero status.
 */
export async function runBrew(args: string[]): Promise<string> {
  const result = await execa('brew', args, { reject: true });
  return result.stdout;
}

/**
 * Returns a list of all installed Homebrew formulae.
 * Cached per process invocation (call site should cache if calling frequently).
 */
export async function listInstalledFormulae(): Promise<string[]> {
  const output = await runBrew(['list', '--formula', '--full-name']);
  return output
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
}

/**
 * Returns a list of all installed Homebrew casks.
 */
export async function listInstalledCasks(): Promise<string[]> {
  const output = await runBrew(['list', '--cask', '--full-name']);
  return output
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
}

/**
 * Install a Homebrew cask.
 * Throws on failure (including offline/network errors).
 */
export async function installCask(name: string): Promise<void> {
  await runBrew(['install', '--cask', name]);
}

/**
 * Install a Homebrew formula.
 * Throws on failure (including offline/network errors).
 */
export async function installFormula(name: string): Promise<void> {
  await runBrew(['install', name]);
}

/**
 * Returns true if a formula is installed.
 */
export async function isFormulaInstalled(name: string): Promise<boolean> {
  try {
    const installed = await listInstalledFormulae();
    return installed.includes(name);
  } catch {
    return false;
  }
}

/**
 * Returns true if a cask is installed.
 */
export async function isCaskInstalled(name: string): Promise<boolean> {
  try {
    const installed = await listInstalledCasks();
    return installed.includes(name);
  } catch {
    return false;
  }
}
