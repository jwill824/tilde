import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

interface ConfigDetectionResult {
  mode: 'wizard' | 'config-first';
  configPath?: string;
}

interface Props {
  onComplete: (result: ConfigDetectionResult) => void;
}

const CONFIG_SEARCH_PATHS = [
  './tilde.config.json',
  join(homedir(), 'Developer/personal/dotfiles/tilde.config.json'),
  join(homedir(), 'Developer/dotfiles/tilde.config.json'),
  join(homedir(), '.dotfiles/tilde.config.json'),
];

export function ConfigDetectionStep({ onComplete }: Props) {
  const [foundConfig, setFoundConfig] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    async function scan() {
      for (const p of CONFIG_SEARCH_PATHS) {
        try {
          await access(p);
          setFoundConfig(p);
          setScanning(false);
          return;
        } catch { /* continue */ }
      }
      setScanning(false);
      onComplete({ mode: 'wizard' });
    }
    scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (scanning) {
    return (
      <Box>
        <Text dimColor>Scanning for existing tilde.config.json...</Text>
      </Box>
    );
  }

  if (!foundConfig) {
    return (
      <Box>
        <Text dimColor>No existing config found. Starting fresh wizard.</Text>
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
