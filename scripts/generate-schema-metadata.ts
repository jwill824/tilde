#!/usr/bin/env npx tsx
/**
 * generate-schema-metadata.ts
 *
 * Serializes the shared tilde config schema metadata for the docs site.
 *
 * Usage: npx tsx scripts/generate-schema-metadata.ts
 * Exit 0: written  |  Exit 1: write/import error
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tildeConfigSchemaMetadata } from '../src/config/schema-metadata.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const artifactPath = resolve(__dirname, '../site/docs/src/data/tilde-config-schema.json');

try {
  mkdirSync(dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(tildeConfigSchemaMetadata, null, 2)}\n`, 'utf8');
  console.log(`✅ Wrote ${artifactPath}`);
  process.exit(0);
} catch (err) {
  console.error(`❌ Could not write schema metadata artifact: ${(err as Error).message}`);
  process.exit(1);
}
