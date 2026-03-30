#!/usr/bin/env npx tsx
/**
 * validate-config-doc-example.ts
 *
 * Reads docs/config-format.md, extracts the first fenced JSON code block
 * in the annotated example section, strips `//` inline comments, parses
 * the result, and validates it against TildeConfigSchema from src/config/schema.ts.
 *
 * Usage: npx tsx scripts/validate-config-doc-example.ts
 * Exit 0: valid  |  Exit 1: invalid or error
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TildeConfigSchema } from '../src/config/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const docPath = resolve(__dirname, '../docs/config-format.md');

let raw: string;
try {
  raw = readFileSync(docPath, 'utf8');
} catch (err) {
  console.error(`❌ Could not read docs/config-format.md: ${(err as Error).message}`);
  process.exit(1);
}

// Extract the first fenced JSON block (```json ... ```)
const fenceMatch = raw.match(/```json\n([\s\S]*?)```/);
if (!fenceMatch) {
  console.error('❌ No fenced JSON code block found in docs/config-format.md');
  process.exit(1);
}

const blockWithComments = fenceMatch[1];

// Strip `//` inline comments (only outside strings — handles URLs like https:// and op://)
function stripJsonComments(text: string): string {
  let result = '';
  let i = 0;
  let inString = false;

  while (i < text.length) {
    const ch = text[i];

    if (inString) {
      if (ch === '\\') {
        // Escaped character — keep both chars and skip ahead
        result += ch + (text[i + 1] ?? '');
        i += 2;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      result += ch;
      i++;
    } else {
      if (ch === '"') {
        inString = true;
        result += ch;
        i++;
      } else if (ch === '/' && text[i + 1] === '/') {
        // Line comment — skip to end of line
        while (i < text.length && text[i] !== '\n') {
          i++;
        }
      } else {
        result += ch;
        i++;
      }
    }
  }

  return result;
}

const stripped = stripJsonComments(blockWithComments);

let parsed: unknown;
try {
  parsed = JSON.parse(stripped);
} catch (err) {
  console.error(`❌ JSON parse failed after stripping comments: ${(err as Error).message}`);
  console.error('Stripped content:\n', stripped);
  process.exit(1);
}

const result = TildeConfigSchema.safeParse(parsed);
if (result.success) {
  console.log('✅ Config doc example is valid');
  process.exit(0);
} else {
  console.error('❌ Config doc example failed Zod validation:');
  for (const issue of result.error.issues) {
    console.error(`  - [${issue.path.join('.')}] ${issue.message}`);
  }
  process.exit(1);
}
