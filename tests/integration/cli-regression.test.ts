import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import { resolve } from 'node:path';

const BIN = resolve(import.meta.dirname, '../..', 'dist/bin/tilde.js');

describe('CLI regression — #45', () => {
  it('produces non-empty stdout on --version', async () => {
    const result = await execa('node', [BIN, '--version'], { reject: false, timeout: 10_000 });
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(result.exitCode).toBe(0);
  });

  it('produces non-empty stdout on --help', async () => {
    const result = await execa('node', [BIN, '--help'], { reject: false, timeout: 10_000 });
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(result.exitCode).toBe(0);
  });

  // FR-002: CLI should reject invalid arguments with a meaningful error message.
  // Currently unimplemented — the CLI ignores unknown flags and launches the wizard.
  // Tracked as a follow-on implementation task.
  it.todo('prints a meaningful error message for invalid arguments (FR-002)');
});
