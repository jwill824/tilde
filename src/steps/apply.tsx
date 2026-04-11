/**
 * Step 16: Apply Configuration
 *
 * Final wizard step. Shows a full summary of what tilde will set up and
 * runs the bootstrap: installs missing packages, writes dotfiles/rc stubs,
 * and configures git identity per context.
 *
 * Delegates to the same installAll + writeAll pipeline used by config-first
 * mode so behaviour is identical to `tilde install`.
 */
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import type { TildeConfig } from '../config/schema.js';
import { ConfigSummary } from '../ui/config-summary.js';
import { installAll } from '../installer/index.js';
import { writeAll } from '../dotfiles/writer.js';
import { pluginRegistry } from '../plugins/registry.js';

interface Props {
  config: TildeConfig;
  onComplete: () => void;
  onBack?: () => void;
}

type Phase = 'confirm' | 'applying' | 'done' | 'error';

export function ApplyStep({ config, onComplete, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('confirm');
  const [progress, setProgress] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleApply() {
    setPhase('applying');
    const log: string[] = [];
    try {
      await installAll(config, pluginRegistry, {
        onProgress: (msg) => {
          log.push(msg);
          setProgress([...log]);
        },
      });
      await writeAll(config);
      setProgress([...log]);
      setPhase('done');
      setTimeout(onComplete, 1500);
    } catch (err) {
      setErrorMsg((err as Error).message);
      setPhase('error');
    }
  }

  if (phase === 'applying') {
    return (
      <Box flexDirection="column">
        <Box>
          <Text color="green"><Spinner type="dots" /></Text>
          <Text> Applying configuration…</Text>
        </Box>
        {progress.map((msg, i) => (
          <Box key={i} marginLeft={2}>
            <Text dimColor>{msg}</Text>
          </Box>
        ))}
      </Box>
    );
  }

  if (phase === 'done') {
    return (
      <Box flexDirection="column">
        <Text color="green" bold>✓ Environment configured!</Text>
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>Your config is saved and your environment is ready.</Text>
          <Text dimColor>Run <Text color="cyan">tilde</Text> anytime to update or reconfigure.</Text>
        </Box>
      </Box>
    );
  }

  if (phase === 'error') {
    return (
      <Box flexDirection="column">
        <Text color="red" bold>Apply failed:</Text>
        <Text color="red">{errorMsg}</Text>
        <Box marginTop={1}>
          <SelectInput
            items={[
              { label: 'Finish (config was saved, apply later)', value: 'skip' },
              ...(onBack ? [{ label: '← Back', value: 'back' }] : []),
            ]}
            onSelect={(item) => {
              if (item.value === 'skip') onComplete();
              if (item.value === 'back' && onBack) onBack();
            }}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>Apply Configuration</Text>
      <Text dimColor>Review your setup before tilde applies it to this machine</Text>
      <Box marginTop={1}>
        <ConfigSummary config={config} />
      </Box>
      <Box marginTop={1}>
        <SelectInput
          items={[
            { label: 'Apply & Finish — install tools, write dotfiles, configure shell', value: 'apply' },
            { label: 'Finish — config is saved, apply later with tilde install', value: 'skip' },
            ...(onBack ? [{ label: '← Back', value: 'back' }] : []),
          ]}
          onSelect={(item) => {
            if (item.value === 'apply') { handleApply().catch(() => {}); }
            if (item.value === 'skip') { onComplete(); }
            if (item.value === 'back' && onBack) { onBack(); }
          }}
        />
      </Box>
    </Box>
  );
}
