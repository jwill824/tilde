import React from 'react';
import { Box, Text } from 'ink';
import { Wizard } from './modes/wizard.js';
import type { TildeConfig } from './config/schema.js';

export type AppMode = 'wizard' | 'config-first' | 'non-interactive';

export interface AppProps {
  mode: AppMode;
  configPath?: string;
  dryRun?: boolean;
  resume?: boolean;
  reconfigure?: boolean;
}

export function App({ mode, configPath, dryRun, resume, reconfigure }: AppProps) {
  if (mode === 'config-first' && configPath) {
    return (
      <Box flexDirection="column">
        <Text color="cyan">tilde — config-first mode</Text>
        <Text dimColor>Loading config from: {configPath}</Text>
      </Box>
    );
  }

  if (mode === 'non-interactive') {
    return (
      <Box flexDirection="column">
        <Text color="cyan">tilde — non-interactive mode</Text>
        {dryRun && <Text color="yellow">[dry-run] No changes will be made.</Text>}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>tilde 🌿</Text>
        <Text dimColor> — macOS developer environment bootstrap</Text>
      </Box>
      {resume && <Text color="yellow">Resuming from checkpoint...</Text>}
      {reconfigure && <Text color="yellow">Reconfiguring from scratch...</Text>}
      <Wizard
        onComplete={(_config: TildeConfig) => {
          // wizard complete — process.exit is handled by ConfigExportStep
        }}
      />
    </Box>
  );
}
