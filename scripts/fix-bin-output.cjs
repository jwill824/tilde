const { readFileSync, rmSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const distDir = process.env.TILDE_DIST_DIR ?? join(__dirname, '..', 'dist');
const binPath = join(distDir, 'bin', 'tilde.js');

const bin = readFileSync(binPath, 'utf-8')
  .replace("from '../src/index.js'", "from '../index.js'");

writeFileSync(binPath, bin);
rmSync(join(distDir, 'src'), { recursive: true, force: true });
