import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('build output layout', () => {
  it('rewrites the bin import and removes duplicated compiled source output', async () => {
    const fakeDist = await mkdtemp(join(tmpdir(), 'tilde-build-output-'));
    const binDir = join(fakeDist, 'bin');
    const duplicatedSrcDir = join(fakeDist, 'src');
    const binPath = join(binDir, 'tilde.js');

    await mkdir(binDir, { recursive: true });
    await mkdir(duplicatedSrcDir, { recursive: true });
    await writeFile(binPath, "import { main } from '../src/index.js';\nmain();\n", 'utf-8');
    await writeFile(join(duplicatedSrcDir, 'index.js'), 'export {};\n', 'utf-8');

    await execFileAsync('node', ['scripts/fix-bin-output.cjs'], {
      cwd: resolve(import.meta.dirname, '../..'),
      env: { ...process.env, TILDE_DIST_DIR: fakeDist },
    });

    expect(existsSync(duplicatedSrcDir)).toBe(false);
    expect(await readFile(binPath, 'utf-8')).toContain("from '../index.js'");
    expect(await readFile(binPath, 'utf-8')).not.toContain("from '../src/index.js'");
  });
});
