import { basename } from 'node:path';
import ignore from 'ignore';
import { defaultSecretPatterns } from '../utils/gitignore.js';

export function createCaptureFilter(extraPatterns?: string[]) {
  const filter = ignore().add(defaultSecretPatterns);
  if (extraPatterns) {
    filter.add(extraPatterns);
  }
  return filter;
}

export function filterDotfiles(
  paths: string[],
  filter: ReturnType<typeof createCaptureFilter>
): { included: string[]; excluded: string[] } {
  const included: string[] = [];
  const excluded: string[] = [];

  for (const filePath of paths) {
    const name = basename(filePath);
    if (filter.ignores(name)) {
      excluded.push(filePath);
      console.log(`[tilde] skipped: ${filePath}`);
    } else {
      included.push(filePath);
    }
  }

  return { included, excluded };
}
