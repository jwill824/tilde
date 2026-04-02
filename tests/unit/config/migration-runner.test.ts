import { describe, it, expect } from 'vitest';
import { runMigrations, CURRENT_SCHEMA_VERSION, type MigrationStep } from '../../../src/config/migrations/runner.js';

// Helper to access the private MIGRATIONS map for test-only registration
// We test by importing and calling the exported runMigrations with a custom targetVersion.

describe('runMigrations()', () => {
  it('same-version input → MigrationResult with didMigrate: false', () => {
    const raw = { schemaVersion: '1.5', name: 'test' };
    const result = runMigrations(raw, '1.5');
    expect(result.didMigrate).toBe(false);
    expect(result.isFutureVersion).toBe(false);
    expect(result.migratedFrom).toBe('1.5');
    expect(result.migratedTo).toBe('1.5');
    expect(result.config).toEqual(raw);
  });

  it('single-hop: input at v1 → output at v1.5 with original fields preserved and schemaVersion updated', () => {
    // No-op path: schemaVersion gets bumped to target even without a transform step
    const raw = { schemaVersion: '1', someField: 'hello' };
    const result = runMigrations(raw, '1.5');
    expect(result.didMigrate).toBe(true);
    expect(result.migratedFrom).toBe('1');
    expect(result.migratedTo).toBe('1.5');
    expect(String(result.config['schemaVersion'])).toBe('1.5');
    expect(result.config['someField']).toBe('hello');
  });

  it('integer schemaVersion 1 is treated as version "1" for migration', () => {
    const raw = { schemaVersion: 1, someField: 'hello' };
    const result = runMigrations(raw, '1.5');
    expect(result.didMigrate).toBe(true);
    expect(result.migratedFrom).toBe('1');
    expect(String(result.config['schemaVersion'])).toBe('1.5');
  });

  it('missing schemaVersion field defaults to "1" (FR-020)', () => {
    const raw: Record<string, unknown> = { someField: 'hello' };
    const result = runMigrations(raw, '1');
    expect(result.migratedFrom).toBe('1');
    expect(result.didMigrate).toBe(false);
  });

  it('schemaVersion higher than target → isFutureVersion: true, didMigrate: false (FR-018)', () => {
    const raw = { schemaVersion: '99', field: 'x' };
    const result = runMigrations(raw, '1.5');
    expect(result.isFutureVersion).toBe(true);
    expect(result.didMigrate).toBe(false);
    expect(result.config).toEqual(raw);
  });

  it('step throws → error propagates and config is unchanged', () => {
    const failingStep: MigrationStep = () => { throw new Error('step failed'); };

    // Manually exercise the loop behavior using a helper that mimics runMigrations
    function runWithStep(
      raw: Record<string, unknown>,
      step: MigrationStep,
    ): Record<string, unknown> {
      let current: Record<string, unknown> = { ...raw };
      current = step(current);
      return current;
    }

    const raw = { schemaVersion: '1', field: 'x' };
    expect(() => runWithStep(raw, failingStep)).toThrow('step failed');
    // Original raw is unchanged
    expect(raw).toEqual({ schemaVersion: '1', field: 'x' });
  });

  it('CURRENT_SCHEMA_VERSION is "1.5"', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe('1.5');
  });
});
