import React, { useState, useEffect } from 'react';
import { Box, Text, Static } from 'ink';
import { Wizard } from './modes/wizard.js';
import { ConfigFirstMode } from './modes/config-first.js';
import { Splash, CompactHeader } from './ui/splash.js';
import type { TildeConfig } from './config/schema.js';
import { loadConfig } from './config/reader.js';
import { installAll } from './installer/index.js';
import { writeAll } from './dotfiles/writer.js';
import { pluginRegistry } from './plugins/registry.js';

export type AppMode = 'wizard' | 'config-first' | 'non-interactive';

export interface AppProps {
  mode: AppMode;
  configPath?: string;
  dryRun?: boolean;
  resume?: boolean;
  reconfigure?: boolean;
  version?: string;
}

interface NonInteractiveProps {
  configPath?: string;
  dryRun?: boolean;
}

function NonInteractiveMode({ configPath, dryRun }: NonInteractiveProps) {
  const [ciStatus, setCiStatus] = useState<'running' | 'done' | 'error'>('running');
  const [ciMessage, setCiMessage] = useState('');

  useEffect(() => {
    if (!configPath) return;
    loadConfig(configPath)
      .then(async (config) => {
        await installAll(config, pluginRegistry, { dryRun });
        await writeAll(config, { dryRun });
        setCiStatus('done');
        setCiMessage('Configuration complete');
      })
      .catch((err: Error) => {
        setCiStatus('error');
        setCiMessage(err.message);
        process.exit(3);
      });
    // configPath and dryRun are mount-time props that never change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box flexDirection="column">
      <Text color="cyan">tilde — non-interactive mode</Text>
      {dryRun && <Text color="yellow">[dry-run] No changes will be made.</Text>}
      {ciStatus === 'running' && <Text dimColor>Running...</Text>}
      {ciStatus === 'done' && <Text color="green">✓ {ciMessage}</Text>}
      {ciStatus === 'error' && <Text color="red">✗ {ciMessage}</Text>}
    </Box>
  );
}

export function App({ mode, configPath, dryRun, resume, reconfigure, version = '0.1.0' }: AppProps) {
  const [splashDone, setSplashDone] = useState(false);
  const [done, setDone] = useState(false);

  // Non-interactive / CI mode skips the splash entirely
  if (mode === 'non-interactive') {
    return <NonInteractiveMode configPath={configPath} dryRun={dryRun} />;
  }

  // Wave splash plays first
  if (!splashDone) {
    return <Splash version={version} onDone={() => setSplashDone(true)} />;
  }

  // After splash: compact header locked at top via Static; wizard/config renders below.
  // As content grows the header naturally scrolls up off-screen (Copilot CLI pattern).
  const header = (
    <Static items={[{ id: 'header', version }]}>
      {(item: { id: string; version: string }) => (
        <CompactHeader key={item.id} version={item.version} />
      )}
    </Static>
  );

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
        {header}
        <ConfigFirstMode configPath={configPath} onComplete={() => setDone(true)} />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {header}
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
