import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { DeveloperContext } from '../config/schema.js';

function expandTilde(p: string): string {
  if (p.startsWith('~/')) return join(homedir(), p.slice(2));
  return p;
}

/**
 * Generate VS Code settings for a developer context.
 * Merges baseSettings with required defaults.
 */
export function generateVscodeSettings(context: DeveloperContext, baseSettings: object = {}): object {
  return {
    'workbench.colorTheme': 'Default Dark+',
    ...baseSettings,
  };
}

/**
 * Write VS Code settings.json to the dotfiles repo.
 * Path: ${dotfilesRepo}/vscode/${context.label}-settings.json
 * Only called if config.configurations?.vscode === true
 */
export async function writeVscodeProfile(context: DeveloperContext, dotfilesRepo: string): Promise<void> {
  const settings = generateVscodeSettings(context);
  const repoPath = expandTilde(dotfilesRepo);
  const dir = join(repoPath, 'vscode');
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, `${context.label}-settings.json`),
    JSON.stringify(settings, null, 2),
    'utf-8'
  );
}
