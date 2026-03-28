/**
 * Schema migration stub for v1 → v1 (no-op).
 * Add v1-to-v2.ts when schema version 2 is introduced.
 */
export function migrateConfig(raw: unknown, fromVersion: number = 1): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;

  const config = raw as Record<string, unknown>;
  const version = fromVersion === 1 ? (config['version'] ?? '1') : String(fromVersion);

  // Current: v1 — no migration needed
  if (version === '1') {
    return raw;
  }

  // Future: add migration logic for newer versions here
  return raw;
}
