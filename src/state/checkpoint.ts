import { z } from 'zod';
import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { TildeConfig } from '../config/schema.js';

const TILDE_DIR = process.env.TILDE_STATE_DIR ?? join(homedir(), '.tilde');
const STATE_FILE = join(TILDE_DIR, 'state.json');

const CheckpointStateSchema = z.object({
  schemaVersion: z.literal(1),
  sessionId: z.string().uuid(),
  startedAt: z.string().datetime(),
  lastCompletedStep: z.number().int().min(-1),
  partialConfig: z.record(z.string(), z.unknown()),
});

export type CheckpointState = z.infer<typeof CheckpointStateSchema>;

export async function loadCheckpoint(): Promise<CheckpointState | null> {
  try {
    const raw = await readFile(STATE_FILE, 'utf-8');
    const parsed = CheckpointStateSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    return null;
  } catch {
    return null;
  }
}

export async function saveCheckpoint(
  lastCompletedStep: number,
  partialConfig: Partial<TildeConfig>,
  existing?: CheckpointState
): Promise<CheckpointState> {
  await mkdir(TILDE_DIR, { recursive: true });

  const state: CheckpointState = existing ?? {
    schemaVersion: 1,
    sessionId: randomUUID(),
    startedAt: new Date().toISOString(),
    lastCompletedStep: -1,
    partialConfig: {},
  };

  const updated: CheckpointState = {
    ...state,
    lastCompletedStep,
    partialConfig: { ...state.partialConfig, ...partialConfig } as Record<string, unknown>,
  };

  // Atomic write: write to a unique temp file then rename so concurrent
  // saves don't clobber each other's temp file before the rename.
  const tmpFile = `${STATE_FILE}.${randomUUID()}.tmp`;
  await writeFile(tmpFile, JSON.stringify(updated, null, 2), 'utf-8');
  // On Node.js, rename is atomic on the same filesystem
  const { rename } = await import('node:fs/promises');
  await rename(tmpFile, STATE_FILE);

  return updated;
}

export async function clearCheckpoint(): Promise<void> {
  try {
    await unlink(STATE_FILE);
  } catch {
    // File may not exist; that's fine
  }
}
