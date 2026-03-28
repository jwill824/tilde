import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Wizard } from './modes/wizard.js';
import { ConfigFirstMode } from './modes/config-first.js';
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
  const [done, setDone] = useState(false);

  if (mode === 'config-first' && configPath) {
    if (done) {
      return (
        <Box>
          <Text color="green">✓ Done. Run </Text>
          <Text bold>tilde</Text>
          <Text color="green"> again at any time to re-apply.</Text>
        </Box>
      );
    }
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color="cyan" bold>tilde 🌿</Text>
          <Text dimColor> — config-first restore</Text>
        </Box>
        <ConfigFirstMode configPath={configPath} onComplete={() => setDone(true)} />
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
