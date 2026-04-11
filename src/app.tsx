import React, { useState, useEffect } from 'react';
import { Box, Text, Static } from 'ink';
import { Wizard } from './modes/wizard.js';
import { ConfigFirstMode } from './modes/config-first.js';
import { ReconfigureMode } from './modes/reconfigure.js';
import { Splash, CompactHeader } from './ui/splash.js';
import type { TildeConfig } from './config/schema.js';
import { loadConfig } from './config/reader.js';
import { captureEnvironment, type EnvironmentSnapshot } from './utils/environment.js';
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
  const [environment, setEnvironment] = useState<EnvironmentSnapshot>({
    os: 'macOS',
    arch: 'unknown',
    shellName: 'unknown',
    shellVersion: undefined,
    tildeVersion: version,
  });

  // Capture real environment at startup for interactive modes; update splash in-flight
  useEffect(() => {
    if (mode === 'non-interactive') return;
    captureEnvironment(version)
      .then(setEnvironment)
      .catch(() => {
        // Fallback is already set above — never crash on detection failure
      });
    // mode and version are mount-time values that never change
  }, []);

  // Non-interactive / CI mode skips the splash entirely
  if (mode === 'non-interactive') {
    return <NonInteractiveMode configPath={configPath} dryRun={dryRun} />;
  }

  // Wave splash plays first
  if (!splashDone) {
    return <Splash environment={environment} onDone={() => setSplashDone(true)} />;
  }

  // After splash: compact header locked at top via Static; wizard/config renders below.
  // As content grows the header naturally scrolls up off-screen (Copilot CLI pattern).
  const header = (
    <Static items={[{ id: 'header', tildeVersion: version }]}>
      {(item: { id: string; tildeVersion: string }) => (
        <CompactHeader key={item.id} tildeVersion={item.tildeVersion} />
      )}
    </Static>
  );

  // --reconfigure flag: open wizard pre-populated with existing config
  if (reconfigure) {
    if (done) {
      return (
        <Box>
          <Text color="green">✓ Configuration updated. Run </Text>
          <Text bold>tilde --config {configPath}</Text>
          <Text color="green"> to apply.</Text>
        </Box>
      );
    }
    return (
      <Box flexDirection="column">
        {header}
        <ReconfigureMode
          configPath={configPath ?? ''}
          environment={environment}
          onComplete={() => setDone(true)}
        />
      </Box>
    );
  }

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
      {done ? (
        <Box flexDirection="column">
          <Text color="green" bold>✓ Configuration complete.</Text>
          <Text dimColor>Run <Text color="cyan">tilde</Text> to edit, or <Text color="cyan">tilde install</Text> to re-apply.</Text>
        </Box>
      ) : (
        <Wizard
          onComplete={(_config: TildeConfig) => {
            setDone(true);
          }}
        />
      )}
    </Box>
  );
}
