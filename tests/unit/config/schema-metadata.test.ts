import { describe, expect, it } from 'vitest';
import {
  flattenConfigSchemaFields,
  tildeConfigSchemaMetadata,
} from '../../../src/config/schema-metadata.js';
import { CURRENT_SCHEMA_VERSION } from '../../../src/config/migrations/runner.js';

describe('tildeConfigSchemaMetadata', () => {
  it('uses the current runtime schema version', () => {
    expect(tildeConfigSchemaMetadata.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(tildeConfigSchemaMetadata.title).toContain('tilde.config.json');
    expect(tildeConfigSchemaMetadata.fields.length).toBeGreaterThan(0);
  });

  it('includes drift-sensitive field paths from the runtime config schema', () => {
    const paths = flattenConfigSchemaFields(tildeConfigSchemaMetadata).map(field => field.path);

    expect(paths).toEqual(expect.arrayContaining([
      'schemaVersion',
      'version',
      'contexts',
      'contexts[].envVars[].value',
      'packageManagers',
      'browser',
      'aiTools',
    ]));
  });

  it('marks schemaVersion as required and top-level version as deprecated', () => {
    const fields = flattenConfigSchemaFields(tildeConfigSchemaMetadata);
    const schemaVersion = fields.find(field => field.path === 'schemaVersion');
    const version = fields.find(field => field.path === 'version');

    expect(schemaVersion).toMatchObject({
      required: true,
      since: '1.7',
    });
    expect(schemaVersion?.description).toMatch(/authoritative/i);

    expect(version).toMatchObject({
      required: false,
      deprecated: true,
    });
    expect(version?.description).toMatch(/deprecated/i);
  });

  it('describes env var values without exposing example secret values', () => {
    const field = flattenConfigSchemaFields(tildeConfigSchemaMetadata)
      .find(candidate => candidate.path === 'contexts[].envVars[].value');

    expect(field).toMatchObject({
      type: 'backend reference string',
      required: true,
    });
    expect(JSON.stringify(field)).not.toMatch(/ghp_|sk-|AKIA|xox[bp]-/);
  });
});
