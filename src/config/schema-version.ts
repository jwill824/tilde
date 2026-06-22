export interface SchemaVersion {
  major: number;
  minor: number;
  raw: string;
}

const SCHEMA_VERSION_PATTERN = /^(\d+)\.(\d+)$/;

export function parseSchemaVersion(value: unknown, label = 'schemaVersion'): SchemaVersion {
  if (value === undefined || value === null) {
    throw new Error(`${label} is required and must be a major.minor string without a patch version`);
  }

  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string in major.minor format without a patch version`);
  }

  const match = SCHEMA_VERSION_PATTERN.exec(value);
  if (!match) {
    const patchNote = value.split('.').length > 2 ? ' Patch versions are not supported.' : '';
    throw new Error(`${label} must use major.minor format without a patch version.${patchNote}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    raw: value,
  };
}

function normalizeSchemaVersion(value: SchemaVersion | string, label: string): SchemaVersion {
  return typeof value === 'string' ? parseSchemaVersion(value, label) : value;
}

export function compareSchemaVersions(a: SchemaVersion | string, b: SchemaVersion | string): number {
  const left = normalizeSchemaVersion(a, 'left schemaVersion');
  const right = normalizeSchemaVersion(b, 'right schemaVersion');

  if (left.major !== right.major) {
    return left.major - right.major;
  }

  return left.minor - right.minor;
}

export function isSchemaVersionGreater(a: string, b: string): boolean {
  return compareSchemaVersions(a, b) > 0;
}
