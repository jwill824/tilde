import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
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

export function ConfigDetectionStep({ onComplete, onExit, onBack: _onBack, isOptional: _isOptional }: Props) {
  const [foundConfig, setFoundConfig] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [paths, setPaths] = useState<string[]>([]);

  useEffect(() => {
    async function scan() {
      const discoveryPaths = await getDiscoveryPaths();
      setPaths(discoveryPaths);
      for (const p of discoveryPaths) {
        try {
          await access(p);
          setFoundConfig(p);
          setScanning(false);
          return;
        } catch { /* continue */ }
      }
      setScanning(false);
    }
    scan();
  }, []);

  if (scanning) {
    return (
      <Box>
        <Text dimColor>Scanning for existing tilde.config.json...</Text>
      </Box>
    );
  }

  if (!foundConfig) {
    const noConfigItems = [
      { label: 'Yes — run setup wizard', value: 'yes' },
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
              } else {
                onExit?.();
              }
            }}
          />
        </Box>
      </Box>
    );
  }

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
              onComplete({ mode: 'config-first', configPath: foundConfig });
            } else {
              onComplete({ mode: 'wizard' });
            }
          }}
        />
      </Box>
    </Box>
  );
}
