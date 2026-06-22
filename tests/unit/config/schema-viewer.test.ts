import { describe, expect, it } from 'vitest';
import { tildeConfigSchemaMetadata } from '../../../src/config/schema-metadata.js';
import {
  formatConfigSchemaJson,
  formatConfigSchemaTree,
} from '../../../src/config/schema-viewer.js';

describe('formatConfigSchemaTree()', () => {
  it('renders a readable terminal tree with version, required, default, and since markers', () => {
    const output = formatConfigSchemaTree();

    expect(output).toContain('tilde.config.json schema');
    expect(output).toContain(`schema version ${tildeConfigSchemaMetadata.schemaVersion}`);
    expect(output).toMatch(/schemaVersion.*required.*since 1\.7/);
    expect(output).toMatch(/packageManagers.*default: \["homebrew"\]/);
    expect(output).toContain('version');
    expect(output).toContain('deprecated');
  });

  it('renders nested field paths in deterministic order', () => {
    const output = formatConfigSchemaTree();

    expect(output.indexOf('contexts')).toBeLessThan(output.indexOf('contexts[].envVars[].value'));
    expect(output).toContain('browser');
    expect(output).toContain('aiTools');
  });
});

describe('formatConfigSchemaJson()', () => {
  it('emits parseable JSON equal to the shared metadata shape', () => {
    const parsed = JSON.parse(formatConfigSchemaJson());

    expect(parsed).toEqual(tildeConfigSchemaMetadata);
    expect(parsed.schemaVersion).toBe(tildeConfigSchemaMetadata.schemaVersion);
    expect(parsed.fields).toEqual(expect.any(Array));
  });
});
