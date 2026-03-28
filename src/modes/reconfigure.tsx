import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { loadConfig } from '../config/reader.js';
import { atomicWriteConfig } from '../config/writer.js';
import { CURRENT_SCHEMA_VERSION } from '../config/migrations/runner.js';
import { Wizard } from './wizard.js';
import type { TildeConfig } from '../config/schema.js';
import type { EnvironmentSnapshot } from '../utils/environment.js';

export interface ReconfigureModeProps {
  configPath: string;
  environment: EnvironmentSnapshot;
  onComplete: () => void;
}

type Phase =
  | { type: 'loading' }
  | { type: 'error'; message: string }
  | { type: 'wizard'; initialConfig: Partial<TildeConfig> }
  | { type: 'saving' }
  | { type: 'done' }
  | { type: 'cancelled' };

export function ReconfigureMode({ configPath, environment: _environment, onComplete }: ReconfigureModeProps) {
  const [phase, setPhase] = useState<Phase>({ type: 'loading' });

  useEffect(() => {
    async function load() {
      if (!configPath) {
        setPhase({
          type: 'error',
          message:
            'No config file found. Run `tilde` (without --reconfigure) to create your initial configuration.',
        });
        return;
      }

      try {
        const config = await loadConfig(configPath);
        setPhase({ type: 'wizard', initialConfig: config });
      } catch (err) {
        const error = err as NodeJS.ErrnoException;

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
            const { TildeConfigSchema } = await import('../config/schema.js');
            const content = await readFile(configPath, 'utf-8');
            const raw = JSON.parse(content) as Record<string, unknown>;
            const partial = TildeConfigSchema.safeParse(raw);
            // Use whatever valid fields we can extract
            const initialConfig: Partial<TildeConfig> = partial.success ? partial.data : (raw as Partial<TildeConfig>);
            setPhase({ type: 'wizard', initialConfig });
          } catch {
            setPhase({ type: 'wizard', initialConfig: {} });
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

  if (phase.type === 'wizard') {
    return (
      <Wizard
        initialConfig={phase.initialConfig}
        onComplete={async (newConfig: TildeConfig) => {
          setPhase({ type: 'saving' });
          try {
            const configWithVersion = { ...newConfig, schemaVersion: CURRENT_SCHEMA_VERSION };
            const content = JSON.stringify(configWithVersion, null, 2) + '\n';
            await atomicWriteConfig(configPath, content);
            setPhase({ type: 'done' });
          } catch (err) {
            setPhase({
              type: 'error',
              message: `Failed to save config: ${(err as Error).message}`,
            });
          }
        }}
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
  onComplete();
  return null;
}
