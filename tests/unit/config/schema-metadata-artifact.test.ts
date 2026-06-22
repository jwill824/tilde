import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  flattenConfigSchemaFields,
  tildeConfigSchemaMetadata,
} from '../../../src/config/schema-metadata.js';

const artifactPath = resolve(process.cwd(), 'site/docs/src/data/tilde-config-schema.json');
const prettyMetadata = `${JSON.stringify(tildeConfigSchemaMetadata, null, 2)}\n`;

describe('docs schema metadata artifact', () => {
  it('matches the runtime config schema metadata exactly', () => {
    expect(readFileSync(artifactPath, 'utf8')).toBe(prettyMetadata);
  });

  it('contains the expected top-level metadata shape', () => {
    const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as unknown;

    expect(artifact).toMatchObject({
      schemaVersion: tildeConfigSchemaMetadata.schemaVersion,
      title: tildeConfigSchemaMetadata.title,
      description: tildeConfigSchemaMetadata.description,
      fields: expect.any(Array),
    });
  });

  it('does not publish raw secret-like examples in field descriptions', () => {
    const secretPattern = /op:\/\/|ghp_|sk-|AKIA|xox[bp]-/i;

    for (const field of flattenConfigSchemaFields(tildeConfigSchemaMetadata)) {
      expect(field.description).not.toMatch(secretPattern);
      expect(JSON.stringify(field.defaultValue ?? '')).not.toMatch(secretPattern);
    }
  });
});
