import {
  flattenConfigSchemaFields,
  tildeConfigSchemaMetadata,
  type ConfigSchemaField,
  type ConfigSchemaMetadata,
} from './schema-metadata.js';

function formatDefaultValue(value: unknown): string {
  return JSON.stringify(value);
}

function markerParts(field: ConfigSchemaField): string[] {
  const parts = [field.required ? 'required' : 'optional'];

  if ('defaultValue' in field) {
    parts.push(`default: ${formatDefaultValue(field.defaultValue)}`);
  }

  parts.push(`since ${field.since}`);

  if (field.deprecated) {
    parts.push('deprecated');
  }

  return parts;
}

function formatFieldTree(field: ConfigSchemaField, depth = 0): string[] {
  const indent = '  '.repeat(depth);
  const lines = [
    `${indent}- ${field.path} (${field.type}; ${markerParts(field).join(', ')})`,
    `${indent}  ${field.description}`,
  ];

  for (const child of field.children ?? []) {
    lines.push(...formatFieldTree(child, depth + 1));
  }

  return lines;
}

export function formatConfigSchemaTree(
  metadata: ConfigSchemaMetadata = tildeConfigSchemaMetadata,
): string {
  const lines = [
    `${metadata.title} (schema version ${metadata.schemaVersion})`,
    metadata.description,
    '',
  ];

  for (const field of metadata.fields) {
    lines.push(...formatFieldTree(field));
  }

  return `${lines.join('\n')}\n`;
}

export function formatConfigSchemaJson(
  metadata: ConfigSchemaMetadata = tildeConfigSchemaMetadata,
): string {
  return `${JSON.stringify(metadata, null, 2)}\n`;
}

export { flattenConfigSchemaFields };
