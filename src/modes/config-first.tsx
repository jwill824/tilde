import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { fromZodError } from 'zod-validation-error';
import { TildeConfigSchema, type TildeConfig } from '../config/schema.js';
import { runMigrations, CURRENT_SCHEMA_VERSION } from '../config/migrations/runner.js';
import { atomicWriteConfig } from '../config/writer.js';
import { installAll } from '../installer/index.js';
import { writeAll } from '../dotfiles/writer.js';
import { pluginRegistry } from '../plugins/registry.js';
import { ConfigSummary } from '../ui/config-summary.js';
import { ContextsStep } from '../steps/contexts.js';
import { ShellStep } from '../steps/shell.js';

interface Props {
  configPath: string;
  onComplete: () => void;
}

type Phase =
  | { type: 'loading' }
  | { type: 'error'; message: string }
  | { type: 'collect-shell'; partial: Record<string, unknown> }
  | { type: 'collect-contexts'; partial: Record<string, unknown> }
  | { type: 'confirm'; config: TildeConfig }
  | { type: 'applying'; config: TildeConfig; progress: string[] }
  | { type: 'done' };

function expandTilde(p: string): string {
  if (p.startsWith('~/')) return join(homedir(), p.slice(2));
  return p;
}

function validateAndTransition(partial: Record<string, unknown>): Phase {
  const result = TildeConfigSchema.safeParse(partial);
  if (result.success) {
    return { type: 'confirm', config: result.data };
  }

  const issues = result.error.issues;

  // Check for missing required fields (invalid_type with undefined received)
  const missingShell = issues.some(
    (i) => i.path[0] === 'shell' && i.code === 'invalid_type'
  );
  const missingContexts = issues.some(
    (i) => i.path[0] === 'contexts'
  );

  if (missingShell) {
    return { type: 'collect-shell', partial };
  }
  if (missingContexts) {
    return { type: 'collect-contexts', partial };
  }

  const validationError = fromZodError(result.error);
  return { type: 'error', message: validationError.message };
}

export function ConfigFirstMode({ configPath, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>({ type: 'loading' });

  useEffect(() => {
    async function load() {
      try {
        const expanded = expandTilde(configPath);
        const content = await readFile(expanded, 'utf-8');
        const raw = JSON.parse(content) as Record<string, unknown>;
        const migrationResult = runMigrations(raw, CURRENT_SCHEMA_VERSION);
        if (migrationResult.didMigrate) {
          const migrated = JSON.stringify({ ...migrationResult.config, schemaVersion: CURRENT_SCHEMA_VERSION }, null, 2) + '\n';
          try {
            await atomicWriteConfig(expanded, migrated);
          } catch {
            // Non-fatal: continue even if migration write fails
          }
        }
        setPhase(validateAndTransition(migrationResult.config as Record<string, unknown>));
      } catch (err) {
        setPhase({ type: 'error', message: (err as Error).message });
      }
    }
    load();
  }, [configPath]);

  async function applyConfig(config: TildeConfig) {
    const progress: string[] = [];
    try {
      await installAll(config, pluginRegistry, {
        onProgress: (msg) => {
          progress.push(msg);
          setPhase({ type: 'applying', config, progress: [...progress] });
        },
      });
      await writeAll(config);
      setPhase({ type: 'done' });
    } catch (err) {
      setPhase({ type: 'error', message: (err as Error).message });
    }
  }

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
        <Text bold color="red">Configuration Error</Text>
        <Text>{phase.message}</Text>
      </Box>
    );
  }

  if (phase.type === 'collect-shell') {
    return (
      <Box flexDirection="column">
        <Text color="yellow">Shell not specified in config. Please select one:</Text>
        <ShellStep
          onComplete={(data) => {
            const merged = { ...phase.partial, shell: data.shell };
            setPhase(validateAndTransition(merged));
          }}
        />
      </Box>
    );
  }

  if (phase.type === 'collect-contexts') {
    const workspaceRoot = typeof phase.partial['workspaceRoot'] === 'string'
      ? phase.partial['workspaceRoot']
      : '~/Developer';
    return (
      <Box flexDirection="column">
        <Text color="yellow">Contexts not specified in config. Please add at least one:</Text>
        <ContextsStep
          workspaceRoot={workspaceRoot}
          onComplete={(data) => {
            const merged = { ...phase.partial, contexts: data.contexts };
            setPhase(validateAndTransition(merged));
          }}
        />
      </Box>
    );
  }

  if (phase.type === 'confirm') {
    const items = [
      { label: 'Apply this configuration', value: 'apply' },
      { label: 'Cancel', value: 'cancel' },
    ];
    return (
      <Box flexDirection="column">
        <ConfigSummary config={phase.config} />
        <Box marginTop={1}>
          <SelectInput
            items={items}
            onSelect={(item) => {
              if (item.value === 'apply') {
                setPhase({ type: 'applying', config: phase.config, progress: [] });
                applyConfig(phase.config);
              } else {
                onComplete();
              }
            }}
          />
        </Box>
      </Box>
    );
  }

  if (phase.type === 'applying') {
    const latest = phase.progress[phase.progress.length - 1];
    return (
      <Box flexDirection="column">
        <Box>
          <Text color="green"><Spinner type="dots" /></Text>
          <Text bold> Applying configuration…</Text>
        </Box>
        {latest && <Text dimColor>{latest}</Text>}
        {phase.progress.length > 1 && (
          <Text dimColor>({phase.progress.length} steps completed)</Text>
        )}
      </Box>
    );
  }

  // phase.type === 'done'
  return (
    <Box flexDirection="column">
      <Text bold color="green">✓ Configuration applied successfully!</Text>
      <Text dimColor>Your developer environment has been set up.</Text>
    </Box>
  );
}
