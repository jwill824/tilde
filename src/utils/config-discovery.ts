/**
 * Config auto-discovery utilities.
 *
 * Searches for tilde.config.json in fixed standard locations in priority order.
 * Explicit --config, TILDE_CONFIG, and positional paths are caller concerns.
 */

import { access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { execa } from 'execa';
import type { ConfigCommandContext } from './config-resolution.js';

/**
 * Detect the git repository root of the current working directory.
 * Returns null if not in a git repo, git is unavailable, or detection times out.
 */
async function getGitRepoRoot(): Promise<string | null> {
  try {
    const result = await execa('git', ['rev-parse', '--show-toplevel'], {
      timeout: 1000,
      reject: false,
    });
    if (result.exitCode === 0 && result.stdout.trim()) {
      return result.stdout.trim();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * The standard config discovery search order (excludes --config explicit path).
 * Returns fixed allowlisted candidates depending on whether a git root is detected.
 */
export async function getDiscoveryPaths(): Promise<string[]> {
  const home = homedir();
  const cwd = resolve(process.cwd(), 'tilde.config.json');
  const canonicalHome = join(home, '.tilde', 'tilde.config.json');
  const xdgHome = join(home, '.config', 'tilde', 'tilde.config.json');
  const homeRoot = join(home, 'tilde.config.json');

  const paths: string[] = [cwd];

  const gitRoot = await getGitRepoRoot();
  if (gitRoot) {
    const gitRootConfig = join(gitRoot, 'tilde.config.json');
    // Only add git root path if it differs from cwd
    if (gitRootConfig !== cwd) {
      paths.push(gitRootConfig);
    }
  }

  paths.push(canonicalHome, xdgHome, homeRoot);
  return [...new Set(paths)];
}

/**
 * Auto-discover a tilde config file by searching standard locations.
 * Returns the first path found, or null if none found.
 */
export async function discoverConfig(): Promise<string | null> {
  for (const p of await getDiscoveryPaths()) {
    try {
      await access(p);
      return p;
    } catch {
      // not found at this path, try next
    }
  }
  return null;
}

function toCommandContext(command: string | ConfigCommandContext = 'install'): ConfigCommandContext {
  if (typeof command !== 'string') {
    return command;
  }

  return {
    command,
    configExample: `tilde ${command} --config <path>`,
  };
}

/**
 * Format the "no config found" error message.
 */
export async function formatNoConfigError(command: string | ConfigCommandContext = 'install'): Promise<string> {
  const context = toCommandContext(command);
  const paths = await getDiscoveryPaths();
  return [
    `Error: tilde requires a config file to run ${context.command}.`,
    `No config found at any of the standard locations.`,
    ``,
    `Run the wizard to create one: tilde`,
    ``,
    `Searched:`,
    ...paths.map(p => `  ${p}`),
    ``,
    `Example locations:`,
    `  ~/.tilde/tilde.config.json`,
    `  ~/.config/tilde/tilde.config.json`,
    `  ~/tilde.config.json`,
    ``,
    `Or specify: ${context.configExample}`,
  ].join('\n');
}

/**
 * Format the "config found via auto-discovery" confirmation message.
 */
export function formatConfigFoundMessage(configPath: string, summary: { contexts: number; tools: number; shell: string }): string {
  return [
    `Found config: ${configPath}`,
    `Applying ${summary.contexts} workspace context${summary.contexts !== 1 ? 's' : ''}, ${summary.tools} tools, shell: ${summary.shell}`,
    `Proceed? [Y/n]`,
  ].join('\n');
}
