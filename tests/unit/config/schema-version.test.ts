import { describe, it, expect } from 'vitest';
import {
  compareSchemaVersions,
  isSchemaVersionGreater,
  parseSchemaVersion,
} from '../../../src/config/schema-version.js';

describe('parseSchemaVersion()', () => {
  it('accepts major.minor strings', () => {
    expect(parseSchemaVersion('1.7')).toEqual({ major: 1, minor: 7, raw: '1.7' });
    expect(parseSchemaVersion('1.10')).toEqual({ major: 1, minor: 10, raw: '1.10' });
    expect(parseSchemaVersion('2.0')).toEqual({ major: 2, minor: 0, raw: '2.0' });
  });

  it('rejects missing schemaVersion values with a major.minor message', () => {
    expect(() => parseSchemaVersion(undefined)).toThrow(/schemaVersion.*major\.minor/i);
    expect(() => parseSchemaVersion(null)).toThrow(/schemaVersion.*major\.minor/i);
  });

  it('rejects non-string schemaVersion values', () => {
    expect(() => parseSchemaVersion(1)).toThrow(/schemaVersion.*string.*major\.minor/i);
    expect(() => parseSchemaVersion({ version: '1.7' })).toThrow(/schemaVersion.*string.*major\.minor/i);
  });

  it('rejects malformed schemaVersion values', () => {
    expect(() => parseSchemaVersion('')).toThrow(/schemaVersion.*major\.minor/i);
    expect(() => parseSchemaVersion('1')).toThrow(/schemaVersion.*major\.minor/i);
    expect(() => parseSchemaVersion('v1.7')).toThrow(/schemaVersion.*major\.minor/i);
    expect(() => parseSchemaVersion('1.x')).toThrow(/schemaVersion.*major\.minor/i);
  });

  it('rejects patch-bearing schemaVersion values', () => {
    expect(() => parseSchemaVersion('1.7.1')).toThrow(/schemaVersion.*major\.minor.*patch/i);
  });

  it('uses the provided label in error messages', () => {
    expect(() => parseSchemaVersion('bad', 'target schemaVersion')).toThrow(/target schemaVersion.*major\.minor/i);
  });
});

describe('compareSchemaVersions()', () => {
  it('orders minor versions numerically instead of with parseFloat semantics', () => {
    expect(compareSchemaVersions('1.10', '1.9')).toBeGreaterThan(0);
    expect(compareSchemaVersions('1.9', '1.10')).toBeLessThan(0);
  });

  it('orders major versions before minor versions', () => {
    expect(compareSchemaVersions('2.0', '1.99')).toBeGreaterThan(0);
    expect(compareSchemaVersions('1.99', '2.0')).toBeLessThan(0);
  });

  it('returns zero for equal schema versions', () => {
    expect(compareSchemaVersions('1.7', '1.7')).toBe(0);
    expect(compareSchemaVersions(parseSchemaVersion('1.7'), '1.7')).toBe(0);
  });
});

describe('isSchemaVersionGreater()', () => {
  it('reports whether one major.minor schemaVersion is newer than another', () => {
    expect(isSchemaVersionGreater('1.10', '1.9')).toBe(true);
    expect(isSchemaVersionGreater('2.0', '1.99')).toBe(true);
    expect(isSchemaVersionGreater('1.7', '1.7')).toBe(false);
    expect(isSchemaVersionGreater('1.6', '1.7')).toBe(false);
  });
});
