import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import fg from 'fast-glob';
import { run } from '../utils/exec.js';

export type EnvironmentCaptureReport = {
  dotfiles: string[];
  brewPackages: string[];
  rcFiles: Record<string, string>;
  skippedFiles: string[];
};

const RC_FILE_NAMES = ['.zshrc', '.zshprofile', '.gitconfig'];

export async function scanDotfiles(homeDir: string): Promise<string[]> {
  const paths = await fg([`${homeDir}/.*`], {
    onlyFiles: true,
    deep: 1,
    dot: true,
  });
  return paths;
}

export async function scanBrewPackages(): Promise<string[]> {
  try {
    const result = await run('brew', ['list', '-1']);
    return result.stdout.split('\n').map(s => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export async function scanRcFiles(dotfilePaths: string[]): Promise<Record<string, string>> {
  const rcPaths = dotfilePaths.filter(p => RC_FILE_NAMES.includes(basename(p)));
  const result: Record<string, string> = {};
  await Promise.all(
    rcPaths.map(async (filePath) => {
      const name = basename(filePath);
      const content = await readFile(filePath, 'utf-8');
      result[name] = content;
    })
  );
  return result;
}

export async function scanEnvironment(homeDir?: string): Promise<EnvironmentCaptureReport> {
  const resolvedHome = homeDir ?? process.env.HOME ?? '~';
  const [dotfiles, brewPackages] = await Promise.all([
    scanDotfiles(resolvedHome),
    scanBrewPackages(),
  ]);
  const rcFiles = await scanRcFiles(dotfiles);
  return {
    dotfiles,
    brewPackages,
    rcFiles,
    skippedFiles: [],
  };
}
