/**
 * Config auto-discovery utilities (T012).
 *
 * Searches for tilde.config.json in standard locations in priority order:
 * 1. --config flag (caller responsibility — not handled here)
 * 2. ./tilde.config.json (current working directory)
 * 3. ~/.config/tilde/tilde.config.json
 * 4. ~/tilde.config.json
 *
 * Per contracts/cli-schema.md §2 and research.md §6.
 */

import { access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

/**
 * The standard config discovery search order (excludes --config explicit path).
 */
export function getDiscoveryPaths(): string[] {
  const home = homedir();
  return [
    resolve(process.cwd(), 'tilde.config.json'),
    join(home, '.config', 'tilde', 'tilde.config.json'),
    join(home, 'tilde.config.json'),
  ];
}

/**
 * Auto-discover a tilde config file by searching standard locations.
 * Returns the first path found, or null if none found.
 */
export async function discoverConfig(): Promise<string | null> {
  for (const p of getDiscoveryPaths()) {
    try {
      await access(p);
      return p;
    } catch {
      // not found at this path, try next
    }
  }
  return null;
}

/**
 * Format the "no config found" error message (per cli-schema.md §2).
 */
export function formatNoConfigError(command: string = 'install'): string {
  const paths = getDiscoveryPaths();
  return [
    `Error: tilde requires a config file to run ${command}.`,
    `No config found at any of the standard locations.`,
    ``,
    `Searched:`,
    ...paths.map(p => `  ${p}`),
    ``,
    `Run the wizard to create one: tilde`,
    `Or specify: tilde ${command} --config <path>`,
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
