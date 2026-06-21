import { CURRENT_SCHEMA_VERSION } from './migrations/runner.js';

export interface ConfigSchemaField {
  path: string;
  label: string;
  type: string;
  required: boolean;
  defaultValue?: unknown;
  since: string;
  deprecated?: boolean;
  description: string;
  children?: ConfigSchemaField[];
}

export interface ConfigSchemaMetadata {
  schemaVersion: string;
  title: string;
  description: string;
  fields: ConfigSchemaField[];
}

export const tildeConfigSchemaMetadata: ConfigSchemaMetadata = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  title: 'tilde.config.json schema',
  description: 'Structural metadata for the supported tilde config format. Values describe fields only and do not read local config files.',
  fields: [
    {
      path: '$schema',
      label: '$schema',
      type: 'string',
      required: false,
      defaultValue: 'https://thingstead.io/tilde/config-schema/v1.json',
      since: '1.0',
      description: 'Optional JSON schema URI for editor tooling.',
    },
    {
      path: 'version',
      label: 'version',
      type: 'literal "1"',
      required: false,
      defaultValue: '1',
      since: '1.0',
      deprecated: true,
      description: 'Deprecated legacy metadata. schemaVersion is authoritative for config compatibility.',
    },
    {
      path: 'schemaVersion',
      label: 'schemaVersion',
      type: 'major.minor string',
      required: true,
      since: '1.7',
      description: 'Authoritative tilde config schema version. Patch versions and numeric values are not supported.',
    },
    {
      path: 'os',
      label: 'os',
      type: 'literal "macos"',
      required: false,
      defaultValue: 'macos',
      since: '1.0',
      description: 'Target operating system for this config.',
    },
    {
      path: 'shell',
      label: 'shell',
      type: 'enum: zsh | bash | fish',
      required: true,
      since: '1.0',
      description: 'Preferred login shell managed by tilde.',
    },
    {
      path: 'packageManagers',
      label: 'packageManagers',
      type: 'string[]',
      required: false,
      defaultValue: ['homebrew'],
      since: '1.6',
      description: 'Package managers tilde may use for requested tools.',
    },
    {
      path: 'versionManagers',
      label: 'versionManagers',
      type: 'object[]',
      required: false,
      defaultValue: [],
      since: '1.0',
      description: 'Language version managers selected for installation or configuration.',
      children: [
        {
          path: 'versionManagers[].name',
          label: 'name',
          type: 'enum: vfox | nvm | pyenv | sdkman',
          required: true,
          since: '1.0',
          description: 'Version manager identifier.',
        },
      ],
    },
    {
      path: 'languages',
      label: 'languages',
      type: 'object[]',
      required: false,
      defaultValue: [],
      since: '1.0',
      description: 'Language runtimes and versions requested for this machine.',
      children: [
        {
          path: 'languages[].name',
          label: 'name',
          type: 'string',
          required: true,
          since: '1.0',
          description: 'Runtime name.',
        },
        {
          path: 'languages[].version',
          label: 'version',
          type: 'string',
          required: true,
          since: '1.0',
          description: 'Requested runtime version.',
        },
        {
          path: 'languages[].manager',
          label: 'manager',
          type: 'string',
          required: true,
          since: '1.0',
          description: 'Version manager name that must match versionManagers[].name.',
        },
      ],
    },
    {
      path: 'workspaceRoot',
      label: 'workspaceRoot',
      type: 'string',
      required: true,
      since: '1.0',
      description: 'Base path for developer workspaces.',
    },
    {
      path: 'dotfilesRepo',
      label: 'dotfilesRepo',
      type: 'absolute or home-relative path string',
      required: true,
      since: '1.0',
      description: 'Path to the dotfiles repository tilde may manage.',
    },
    {
      path: 'contexts',
      label: 'contexts',
      type: 'object[]',
      required: true,
      since: '1.0',
      description: 'Developer contexts with paths, git identity, auth preference, and optional environment references.',
      children: [
        {
          path: 'contexts[].label',
          label: 'label',
          type: 'string',
          required: true,
          since: '1.0',
          description: 'Unique context label.',
        },
        {
          path: 'contexts[].path',
          label: 'path',
          type: 'string',
          required: true,
          since: '1.0',
          description: 'Filesystem path matched to this context.',
        },
        {
          path: 'contexts[].git',
          label: 'git',
          type: 'object',
          required: true,
          since: '1.0',
          description: 'Git identity used in this context.',
          children: [
            {
              path: 'contexts[].git.name',
              label: 'name',
              type: 'string',
              required: true,
              since: '1.0',
              description: 'Git author name.',
            },
            {
              path: 'contexts[].git.email',
              label: 'email',
              type: 'email string',
              required: true,
              since: '1.0',
              description: 'Git author email address.',
            },
          ],
        },
        {
          path: 'contexts[].github',
          label: 'github',
          type: 'object',
          required: false,
          since: '1.0',
          description: 'Optional GitHub account identity for this context.',
          children: [
            {
              path: 'contexts[].github.username',
              label: 'username',
              type: 'string',
              required: true,
              since: '1.0',
              description: 'GitHub username.',
            },
          ],
        },
        {
          path: 'contexts[].authMethod',
          label: 'authMethod',
          type: 'enum: gh-cli | https | ssh',
          required: true,
          since: '1.0',
          description: 'Preferred Git authentication method.',
        },
        {
          path: 'contexts[].envVars',
          label: 'envVars',
          type: 'object[]',
          required: false,
          defaultValue: [],
          since: '1.0',
          description: 'Environment variable references for this context. Values remain backend references, not resolved secrets.',
          children: [
            {
              path: 'contexts[].envVars[].key',
              label: 'key',
              type: 'string',
              required: true,
              since: '1.0',
              description: 'Environment variable name.',
            },
            {
              path: 'contexts[].envVars[].value',
              label: 'value',
              type: 'backend reference string',
              required: true,
              since: '1.0',
              description: 'Reference to a secret backend or non-secret value placeholder. Raw token values are not part of schema metadata.',
            },
          ],
        },
        {
          path: 'contexts[].vscodeProfile',
          label: 'vscodeProfile',
          type: 'string',
          required: false,
          since: '1.0',
          description: 'Optional VS Code profile name.',
        },
        {
          path: 'contexts[].isDefault',
          label: 'isDefault',
          type: 'boolean',
          required: false,
          since: '1.0',
          description: 'Whether this context is the default context.',
        },
        {
          path: 'contexts[].languageBindings',
          label: 'languageBindings',
          type: 'object[]',
          required: false,
          defaultValue: [],
          since: '1.5',
          description: 'Per-context runtime bindings.',
          children: [
            {
              path: 'contexts[].languageBindings[].runtime',
              label: 'runtime',
              type: 'string',
              required: true,
              since: '1.5',
              description: 'Runtime name for this binding.',
            },
            {
              path: 'contexts[].languageBindings[].version',
              label: 'version',
              type: 'string',
              required: true,
              since: '1.5',
              description: 'Runtime version for this binding.',
            },
            {
              path: 'contexts[].languageBindings[].manager',
              label: 'manager',
              type: 'string',
              required: false,
              since: '1.5',
              description: 'Optional version manager used for this binding.',
            },
          ],
        },
        {
          path: 'contexts[].dotfilesPath',
          label: 'dotfilesPath',
          type: 'string',
          required: false,
          since: '1.6',
          description: 'Optional per-context dotfiles location.',
        },
      ],
    },
    {
      path: 'tools',
      label: 'tools',
      type: 'string[]',
      required: false,
      defaultValue: [],
      since: '1.0',
      description: 'Requested developer tools.',
    },
    {
      path: 'configurations',
      label: 'configurations',
      type: 'object',
      required: true,
      since: '1.0',
      description: 'Configuration domains tilde may write.',
      children: [
        {
          path: 'configurations.git',
          label: 'git',
          type: 'boolean',
          required: true,
          since: '1.0',
          description: 'Whether tilde manages Git configuration.',
        },
        {
          path: 'configurations.vscode',
          label: 'vscode',
          type: 'boolean',
          required: true,
          since: '1.0',
          description: 'Whether tilde manages VS Code configuration.',
        },
        {
          path: 'configurations.aliases',
          label: 'aliases',
          type: 'boolean',
          required: true,
          since: '1.0',
          description: 'Whether tilde manages shell aliases.',
        },
        {
          path: 'configurations.osDefaults',
          label: 'osDefaults',
          type: 'boolean',
          required: true,
          since: '1.0',
          description: 'Whether tilde manages macOS defaults.',
        },
        {
          path: 'configurations.direnv',
          label: 'direnv',
          type: 'boolean',
          required: true,
          since: '1.0',
          description: 'Whether tilde manages direnv configuration.',
        },
      ],
    },
    {
      path: 'accounts',
      label: 'accounts',
      type: 'object[]',
      required: false,
      defaultValue: [],
      since: '1.0',
      description: 'External account records and optional secret references.',
      children: [
        {
          path: 'accounts[].service',
          label: 'service',
          type: 'string',
          required: true,
          since: '1.0',
          description: 'External service identifier.',
        },
        {
          path: 'accounts[].identifier',
          label: 'identifier',
          type: 'string',
          required: true,
          since: '1.0',
          description: 'Account identifier for the service.',
        },
        {
          path: 'accounts[].secretRef',
          label: 'secretRef',
          type: 'backend reference string',
          required: false,
          since: '1.0',
          description: 'Optional backend reference for account credentials.',
        },
      ],
    },
    {
      path: 'secretsBackend',
      label: 'secretsBackend',
      type: 'enum: 1password | keychain | env-only',
      required: true,
      since: '1.0',
      description: 'Backend used for secret references.',
    },
    {
      path: 'browser',
      label: 'browser',
      type: 'object',
      required: false,
      defaultValue: { selected: [], default: null },
      since: '1.5',
      description: 'Browser selection and default browser preference.',
      children: [
        {
          path: 'browser.selected',
          label: 'selected',
          type: 'string[]',
          required: false,
          defaultValue: [],
          since: '1.5',
          description: 'Selected browser identifiers.',
        },
        {
          path: 'browser.default',
          label: 'default',
          type: 'string | null',
          required: false,
          defaultValue: null,
          since: '1.5',
          description: 'Default browser identifier, or null when unset.',
        },
      ],
    },
    {
      path: 'editors',
      label: 'editors',
      type: 'object',
      required: false,
      since: '1.5',
      description: 'Editor preferences.',
      children: [
        {
          path: 'editors.primary',
          label: 'primary',
          type: 'string',
          required: true,
          since: '1.5',
          description: 'Primary editor identifier.',
        },
        {
          path: 'editors.additional',
          label: 'additional',
          type: 'string[]',
          required: false,
          defaultValue: [],
          since: '1.5',
          description: 'Additional editor identifiers.',
        },
      ],
    },
    {
      path: 'aiTools',
      label: 'aiTools',
      type: 'object[]',
      required: false,
      defaultValue: [],
      since: '1.5',
      description: 'AI tools requested for installation or configuration.',
      children: [
        {
          path: 'aiTools[].name',
          label: 'name',
          type: 'string',
          required: true,
          since: '1.5',
          description: 'AI tool identifier.',
        },
        {
          path: 'aiTools[].label',
          label: 'label',
          type: 'string',
          required: true,
          since: '1.5',
          description: 'Human-readable AI tool name.',
        },
        {
          path: 'aiTools[].variant',
          label: 'variant',
          type: 'string',
          required: true,
          since: '1.5',
          description: 'AI tool variant, such as desktop app, CLI tool, or editor extension.',
        },
      ],
    },
  ],
};

export function flattenConfigSchemaFields(
  metadataOrFields: ConfigSchemaMetadata | ConfigSchemaField[],
): ConfigSchemaField[] {
  const fields = Array.isArray(metadataOrFields) ? metadataOrFields : metadataOrFields.fields;
  const flattened: ConfigSchemaField[] = [];

  for (const field of fields) {
    flattened.push(field);
    if (field.children) {
      flattened.push(...flattenConfigSchemaFields(field.children));
    }
  }

  return flattened;
}
