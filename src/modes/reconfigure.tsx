import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { loadConfigWithMetadata } from '../config/reader.js';
import { atomicWriteConfig } from '../config/writer.js';
import { CURRENT_SCHEMA_VERSION } from '../config/migrations/runner.js';
import { isSchemaVersionGreater } from '../config/schema-version.js';
import { Wizard } from './wizard.js';
import { formatNoConfigError } from '../utils/config-discovery.js';
import { DeveloperContextSchema, TildeConfigSchema, type TildeConfig } from '../config/schema.js';
import type { EnvironmentSnapshot } from '../utils/environment.js';

export interface ReconfigureModeProps {
  configPath: string;
  environment: EnvironmentSnapshot;
  onComplete: () => void;
}

type Phase =
  | { type: 'loading' }
  | { type: 'error'; message: string }
  | { type: 'field-errors'; issues: string[]; initialConfig: Partial<TildeConfig> }
  | { type: 'wizard'; initialConfig: Partial<TildeConfig> }
  | { type: 'saving' }
  | { type: 'done' }
  | { type: 'cancelled' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
    ? value
    : undefined;
}

function formatFutureSchemaMutationError(schemaVersion: unknown): string {
  return `This config uses schemaVersion ${String(schemaVersion)}, which is newer than this version of tilde supports.\nUpgrade tilde before applying or rewriting this config.`;
}

function isFutureSchemaVersion(value: unknown): boolean {
  try {
    return typeof value === 'string' && isSchemaVersionGreater(value, CURRENT_SCHEMA_VERSION);
  } catch {
    return false;
  }
}

function recoverValidConfigFields(raw: Record<string, unknown>): Partial<TildeConfig> {
  const recovered: Partial<TildeConfig> = {};

  if (raw.$schema === undefined || typeof raw.$schema === 'string') recovered.$schema = raw.$schema;
  if (raw.version === undefined || raw.version === '1') recovered.version = raw.version;
  if (typeof raw.schemaVersion === 'string' || typeof raw.schemaVersion === 'number') recovered.schemaVersion = String(raw.schemaVersion);
  if (raw.os === 'macos') recovered.os = raw.os;
  if (raw.shell === 'zsh' || raw.shell === 'bash' || raw.shell === 'fish') recovered.shell = raw.shell;

  const packageManagers = stringArray(raw.packageManagers);
  if (packageManagers && packageManagers.length > 0) recovered.packageManagers = packageManagers;

  if (Array.isArray(raw.versionManagers) && raw.versionManagers.every(item => isRecord(item) && ['vfox', 'nvm', 'pyenv', 'sdkman'].includes(String(item.name)))) {
    recovered.versionManagers = raw.versionManagers as TildeConfig['versionManagers'];
  }

  if (Array.isArray(raw.languages) && raw.languages.every(item => isRecord(item) && typeof item.name === 'string' && typeof item.version === 'string' && typeof item.manager === 'string')) {
    recovered.languages = raw.languages as TildeConfig['languages'];
  }

  if (typeof raw.workspaceRoot === 'string' && raw.workspaceRoot.length > 0) recovered.workspaceRoot = raw.workspaceRoot;
  if (typeof raw.dotfilesRepo === 'string' && (raw.dotfilesRepo.startsWith('/') || raw.dotfilesRepo.startsWith('~/'))) recovered.dotfilesRepo = raw.dotfilesRepo;

  if (Array.isArray(raw.contexts)) {
    const contexts = raw.contexts
      .map(context => DeveloperContextSchema.safeParse(context))
      .filter((result): result is Extract<typeof result, { success: true }> => result.success)
      .map(result => result.data);
    if (contexts.length > 0) recovered.contexts = contexts;
  }

  const tools = stringArray(raw.tools);
  if (tools) recovered.tools = tools;

  if (
    isRecord(raw.configurations) &&
    typeof raw.configurations.git === 'boolean' &&
    typeof raw.configurations.vscode === 'boolean' &&
    typeof raw.configurations.aliases === 'boolean' &&
    typeof raw.configurations.osDefaults === 'boolean' &&
    typeof raw.configurations.direnv === 'boolean'
  ) {
    recovered.configurations = raw.configurations as TildeConfig['configurations'];
  }

  if (Array.isArray(raw.accounts) && raw.accounts.every(account => isRecord(account) && typeof account.service === 'string' && typeof account.identifier === 'string')) {
    recovered.accounts = raw.accounts as TildeConfig['accounts'];
  }

  if (raw.secretsBackend === '1password' || raw.secretsBackend === 'keychain' || raw.secretsBackend === 'env-only') {
    recovered.secretsBackend = raw.secretsBackend;
  }

  if (isRecord(raw.browser)) recovered.browser = raw.browser as TildeConfig['browser'];
  if (isRecord(raw.editors) && typeof raw.editors.primary === 'string' && Array.isArray(raw.editors.additional)) recovered.editors = raw.editors as TildeConfig['editors'];
  if (Array.isArray(raw.aiTools) && raw.aiTools.every(tool => isRecord(tool) && typeof tool.name === 'string' && typeof tool.label === 'string' && typeof tool.variant === 'string')) {
    recovered.aiTools = raw.aiTools as TildeConfig['aiTools'];
  }

  return recovered;
}

async function saveConfig(configPath: string, newConfig: TildeConfig) {
  const parsed = TildeConfigSchema.parse({ ...newConfig, schemaVersion: CURRENT_SCHEMA_VERSION });
  const content = JSON.stringify(parsed, null, 2) + '\n';
  await atomicWriteConfig(configPath, content);
}

export function ReconfigureMode({ configPath, environment: _environment, onComplete }: ReconfigureModeProps) {
  const [phase, setPhase] = useState<Phase>({ type: 'loading' });

  useEffect(() => {
    async function load() {
      if (!configPath) {
        setPhase({
          type: 'error',
          message: await formatNoConfigError({
            command: 'reconfigure',
            configExample: 'tilde --reconfigure --config <path>',
          }),
        });
        return;
      }

      try {
        const result = await loadConfigWithMetadata(configPath);
        if (!result.metadata.canMutate || result.metadata.isFutureVersion) {
          setPhase({
            type: 'error',
            message: formatFutureSchemaMutationError(result.metadata.migration.migratedFrom),
          });
          return;
        }
        setPhase({ type: 'wizard', initialConfig: result.config });
      } catch (err) {
        const error = err as Error & { code?: string };

        if (error.code === 'ENOENT') {
          setPhase({
            type: 'error',
            message:
              `Config file not found at ${configPath}. ` +
              `Run \`tilde\` (without --reconfigure) to create your initial configuration.`,
          });
          return;
        }

        // Validation/parse failure — try to extract partial config
        if (error.message?.includes('Config validation failed') || error.message?.includes('parse')) {
          // Attempt partial parse from raw file
          try {
            const { readFile } = await import('node:fs/promises');
            const content = await readFile(configPath, 'utf-8');
            const raw = JSON.parse(content) as Record<string, unknown>;
            if (isFutureSchemaVersion(raw.schemaVersion)) {
              setPhase({
                type: 'error',
                message: formatFutureSchemaMutationError(raw.schemaVersion),
              });
              return;
            }
            const partial = TildeConfigSchema.safeParse(raw);
            const initialConfig: Partial<TildeConfig> = partial.success ? partial.data : recoverValidConfigFields(raw);
            const issues = partial.success
              ? []
              : partial.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
            setPhase({ type: 'field-errors', issues, initialConfig });
          } catch (parseErr) {
            setPhase({
              type: 'error',
              message:
                `Failed to parse config from ${configPath}: ${(parseErr as Error).message}. ` +
                `Fix the JSON before running --reconfigure; the original file was not modified.`,
            });
          }
          return;
        }

        setPhase({
          type: 'error',
          message:
            `Failed to load config from ${configPath}: ${error.message}. ` +
            `Check file permissions and try again.`,
        });
      }
    }

    load();
  }, [configPath]);

  if (phase.type === 'loading') {
    return (
      <Box>
        <Text color="green"><Spinner type="dots" /></Text>
        <Text> Loading config from {configPath}…</Text>
      </Box>
    );
  }

  if (phase.type === 'error') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1}>
        <Text bold color="red">Reconfigure Error</Text>
        <Text>{phase.message}</Text>
      </Box>
    );
  }

  if (phase.type === 'field-errors') {
    return (
      <Box flexDirection="column">
        <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1} marginBottom={1}>
          <Text bold color="yellow">⚠ Config has invalid fields — wizard will use defaults for these:</Text>
          {phase.issues.map((issue, i) => (
            <Text key={i} dimColor>  • {issue}</Text>
          ))}
        </Box>
        <Wizard
          initialConfig={phase.initialConfig}
          onComplete={async (newConfig: TildeConfig) => {
            setPhase({ type: 'saving' });
            try {
              await saveConfig(configPath, newConfig);
              setPhase({ type: 'done' });
            } catch (err) {
              setPhase({ type: 'error', message: `Failed to save config: ${(err as Error).message}` });
            }
          }}
          onExit={() => setPhase({ type: 'cancelled' })}
        />
      </Box>
    );
  }

  if (phase.type === 'wizard') {
    return (
      <Wizard
        initialConfig={phase.initialConfig}
        onComplete={async (newConfig: TildeConfig) => {
          setPhase({ type: 'saving' });
          try {
            await saveConfig(configPath, newConfig);
            setPhase({ type: 'done' });
          } catch (err) {
            setPhase({
              type: 'error',
              message: `Failed to save config: ${(err as Error).message}`,
            });
          }
        }}
        onExit={() => setPhase({ type: 'cancelled' })}
      />
    );
  }

  if (phase.type === 'saving') {
    return (
      <Box>
        <Text color="green"><Spinner type="dots" /></Text>
        <Text> Saving updated configuration…</Text>
      </Box>
    );
  }

  if (phase.type === 'done') {
    // Notify parent and render success
    onComplete();
    return (
      <Box flexDirection="column">
        <Text bold color="green">✓ Configuration updated successfully!</Text>
        <Text dimColor>Your developer environment configuration has been saved.</Text>
      </Box>
    );
  }

  // phase.type === 'cancelled'
  return (
    <Box flexDirection="column">
      <Text color="yellow">Configuration unchanged. Your original config file has been preserved.</Text>
    </Box>
  );
}
