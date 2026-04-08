import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { access } from 'node:fs/promises';
import { getDiscoveryPaths } from '../utils/config-discovery.js';

interface ConfigDetectionResult {
  mode: 'wizard' | 'config-first';
  configPath?: string;
}

interface Props {
  onComplete: (result: ConfigDetectionResult) => void;
  onExit?: () => void;
  onBack?: () => void;
  isOptional?: boolean;
}

type Phase = 'scanning' | 'no-config-menu' | 'enter-path' | 'found-config';

export function ConfigDetectionStep({ onComplete, onExit, onBack: _onBack, isOptional: _isOptional }: Props) {
  const [foundConfig, setFoundConfig] = useState<string | null>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>('scanning');
  const [customPath, setCustomPath] = useState('');
  const [pathError, setPathError] = useState('');

  useEffect(() => {
    async function scan() {
      const discoveryPaths = await getDiscoveryPaths();
      setPaths(discoveryPaths);
      for (const p of discoveryPaths) {
        try {
          await access(p);
          setFoundConfig(p);
          setPhase('found-config');
          return;
        } catch { /* continue */ }
      }
      setPhase('no-config-menu');
    }
    scan();
  }, []);

  if (phase === 'scanning') {
    return (
      <Box>
        <Text dimColor>Scanning for existing tilde.config.json...</Text>
      </Box>
    );
  }

  if (phase === 'no-config-menu') {
    const noConfigItems = [
      { label: 'Yes — run setup wizard', value: 'yes' },
      { label: 'Load existing config from a custom path', value: 'browse' },
      { label: 'No — exit', value: 'no' },
    ];

    return (
      <Box flexDirection="column">
        <Text>No existing config found.</Text>
        <Text dimColor>Searched: {paths.join(', ')}</Text>
        <Box marginTop={1}>
          <Text>Create a new tilde config?</Text>
        </Box>
        <Box marginTop={1}>
          <SelectInput
            items={noConfigItems}
            onSelect={(item) => {
              if (item.value === 'yes') {
                onComplete({ mode: 'wizard' });
              } else if (item.value === 'browse') {
                setPhase('enter-path');
              } else {
                onExit?.();
              }
            }}
          />
        </Box>
      </Box>
    );
  }

  if (phase === 'enter-path') {
    return (
      <Box flexDirection="column">
        <Text bold>Enter path to existing tilde.config.json:</Text>
        {pathError && <Text color="red">{pathError}</Text>}
        <Box marginTop={1}>
          <TextInput
            value={customPath}
            onChange={setCustomPath}
            placeholder="/path/to/tilde.config.json"
            onSubmit={async (val) => {
              const p = val.trim();
              if (!p) { setPathError('Path cannot be empty'); return; }
              try {
                await access(p);
                onComplete({ mode: 'config-first', configPath: p });
              } catch {
                setPathError(`Cannot access: ${p}`);
              }
            }}
          />
        </Box>
        <Text dimColor>Press Enter to confirm, or leave blank and Enter to go back</Text>
      </Box>
    );
  }

  // phase === 'found-config'
  const items = [
    { label: `Use existing config (${foundConfig})`, value: 'config-first' },
    { label: 'Start fresh wizard', value: 'wizard' },
  ];

  return (
    <Box flexDirection="column">
      <Text color="cyan">Found existing tilde.config.json:</Text>
      <Text dimColor>{foundConfig}</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={(item) => {
            if (item.value === 'config-first') {
              onComplete({ mode: 'config-first', configPath: foundConfig! });
            } else {
              onComplete({ mode: 'wizard' });
            }
          }}
        />
      </Box>
    </Box>
  );
}

