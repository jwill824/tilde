import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { DeveloperContext } from '../config/schema.js';

/**
 * Generate VS Code settings for a named profile.
 * Phase 7 (T086) full implementation.
 */
export async function generateVscodeSettings(context: DeveloperContext): Promise<void> {
  if (!context.vscodeProfile) return;

  const profileDir = join(
    homedir(),
    'Library/Application Support/Code/User/profiles',
    context.vscodeProfile
  );
  await mkdir(profileDir, { recursive: true });

  const settings = {
    'editor.formatOnSave': true,
    'git.autofetch': true,
  };

  await writeFile(
    join(profileDir, 'settings.json'),
    JSON.stringify(settings, null, 2),
    'utf-8'
  );
}
