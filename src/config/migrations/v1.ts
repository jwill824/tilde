/**
 * Schema migration stub for v1 → v1 (no-op).
 * Add v1-to-v2.ts when schema version 2 is introduced.
 */
export function migrateConfig(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;

  const config = raw as Record<string, unknown>;
  const version = config['version'];

  // Current: v1 — no migration needed
  if (version === '1' || version === undefined) {
    return raw;
  }

  // Future: add migration logic for newer versions here
  return raw;
}
