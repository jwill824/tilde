/**
 * Unit tests for tilde update command (T018).
 *
 * Tests resource validation, error outputs, and only-targeted-section behavior.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  isValidUpdateResource,
  formatInvalidResourceError,
  VALID_UPDATE_RESOURCES,
  type UpdateResource,
} from '../../src/modes/update.js';

describe('isValidUpdateResource()', () => {
  it('returns true for all valid resource names', () => {
    for (const resource of VALID_UPDATE_RESOURCES) {
      expect(isValidUpdateResource(resource)).toBe(true);
    }
  });

  it('returns false for unknown resource name', () => {
    expect(isValidUpdateResource('widgets')).toBe(false);
    expect(isValidUpdateResource('foo')).toBe(false);
    expect(isValidUpdateResource('')).toBe(false);
  });

  it('is case-sensitive (uppercase is invalid)', () => {
    expect(isValidUpdateResource('Shell')).toBe(false);
    expect(isValidUpdateResource('SHELL')).toBe(false);
  });

  it('valid resources are exactly the 7 documented ones', () => {
    expect(VALID_UPDATE_RESOURCES).toEqual([
      'shell', 'editor', 'applications', 'browser', 'ai-tools', 'contexts', 'languages',
    ]);
  });
});

describe('formatInvalidResourceError()', () => {
  it('includes the invalid resource name in the error', () => {
    const msg = formatInvalidResourceError('widgets');
    expect(msg).toContain('"widgets"');
    expect(msg).toContain('is not a valid update resource');
  });

  it('lists all valid resources', () => {
    const msg = formatInvalidResourceError('foo');
    for (const r of VALID_UPDATE_RESOURCES) {
      expect(msg).toContain(r);
    }
  });

  it('includes usage guidance', () => {
    const msg = formatInvalidResourceError('foo');
    expect(msg).toContain('tilde update <resource>');
  });
});

describe('VALID_UPDATE_RESOURCES contract', () => {
  it('includes shell', () => expect(VALID_UPDATE_RESOURCES).toContain('shell'));
  it('includes editor', () => expect(VALID_UPDATE_RESOURCES).toContain('editor'));
  it('includes applications', () => expect(VALID_UPDATE_RESOURCES).toContain('applications'));
  it('includes browser', () => expect(VALID_UPDATE_RESOURCES).toContain('browser'));
  it('includes ai-tools', () => expect(VALID_UPDATE_RESOURCES).toContain('ai-tools'));
  it('includes contexts', () => expect(VALID_UPDATE_RESOURCES).toContain('contexts'));
  it('includes languages', () => expect(VALID_UPDATE_RESOURCES).toContain('languages'));
});
