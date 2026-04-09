import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

// We need to override TILDE_STATE_DIR before importing checkpoint module
const testDir = join(tmpdir(), `tilde-test-${randomUUID()}`);

// Set env var before module import
process.env.TILDE_STATE_DIR = testDir;

// Now import after setting the env var (module is cached so we need dynamic import or vi.mock)
// Use dynamic imports in tests

describe('checkpoint', () => {
  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    // Clear any existing state
    try {
      const { clearCheckpoint } = await import('../../src/state/checkpoint.js');
      await clearCheckpoint();
    } catch { /* ignore */ }
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    await mkdir(testDir, { recursive: true });
  });

  it('loadCheckpoint returns null when no checkpoint exists', async () => {
    const { loadCheckpoint } = await import('../../src/state/checkpoint.js');
    const result = await loadCheckpoint();
    expect(result).toBeNull();
  });

  it('saveCheckpoint persists state to disk', async () => {
    const { saveCheckpoint, loadCheckpoint } = await import('../../src/state/checkpoint.js');
    
    await saveCheckpoint(3, {
      shell: 'zsh',
      packageManagers: ['homebrew'],
    } as Parameters<typeof saveCheckpoint>[1]);

    const loaded = await loadCheckpoint();
    expect(loaded).not.toBeNull();
    expect(loaded!.lastCompletedStep).toBe(3);
    expect(loaded!.partialConfig).toMatchObject({ shell: 'zsh' });
  });

  it('clearCheckpoint removes the state file', async () => {
    const { saveCheckpoint, clearCheckpoint, loadCheckpoint } = await import('../../src/state/checkpoint.js');
    
    await saveCheckpoint(5, { shell: 'zsh' } as Parameters<typeof saveCheckpoint>[1]);
    await clearCheckpoint();

    const result = await loadCheckpoint();
    expect(result).toBeNull();
  });

  it('saveCheckpoint assigns a sessionId', async () => {
    const { saveCheckpoint } = await import('../../src/state/checkpoint.js');
    
    const state = await saveCheckpoint(0, {});
    expect(state.sessionId).toBeDefined();
    expect(state.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('saveCheckpoint writes atomically (file is valid JSON even if checked mid-write)', async () => {
    const { saveCheckpoint } = await import('../../src/state/checkpoint.js');
    
    // Run multiple saves concurrently
    await Promise.all([
      saveCheckpoint(1, { shell: 'zsh' } as Parameters<typeof saveCheckpoint>[1]),
      saveCheckpoint(2, { shell: 'bash' } as Parameters<typeof saveCheckpoint>[1]),
      saveCheckpoint(3, { shell: 'fish' } as Parameters<typeof saveCheckpoint>[1]),
    ]);

    // Read the state file directly and check it's valid JSON
    const stateFile = join(testDir, 'state.json');
    const content = await readFile(stateFile, 'utf-8');
    const parsed = JSON.parse(content); // Should not throw
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.lastCompletedStep).toBeDefined();
  });
});
