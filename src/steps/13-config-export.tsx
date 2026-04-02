import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import type { TildeConfig } from '../config/schema.js';
import { writeConfig } from '../config/writer.js';

interface Props {
  config: TildeConfig;
  onComplete: () => void;
  onBack?: () => void;
  isOptional?: boolean;
}

type Status = 'confirm' | 'writing' | 'done' | 'error';

export function ConfigExportStep({ config, onComplete, onBack: _onBack, isOptional: _isOptional }: Props) {
  const [status, setStatus] = useState<Status>('confirm');
  const [error, setError] = useState('');
  const [outputPath, setOutputPath] = useState('');

  const items = [
    { label: 'Write config and finish', value: 'confirm' },
    { label: 'Cancel', value: 'cancel' },
  ];

  if (status === 'writing') {
    return (
      <Box>
        <Text color="cyan">Writing tilde.config.json...</Text>
      </Box>
    );
  }

  if (status === 'done') {
    return (
      <Box flexDirection="column">
        <Text color="green" bold>✓ tilde.config.json written!</Text>
        <Text dimColor>{outputPath}</Text>
        <Box marginTop={1}>
          <Text>Setup complete. Run </Text>
          <Text color="cyan">tilde install</Text>
          <Text> on any machine to apply this config.</Text>
        </Box>
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box flexDirection="column">
        <Text color="red">Error writing config:</Text>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>Configuration summary</Text>
      <Box borderStyle="round" borderColor="cyan" flexDirection="column" padding={1} marginTop={1}>
        <Text>OS: <Text color="cyan">{config.os}</Text></Text>
        <Text>Shell: <Text color="cyan">{config.shell}</Text></Text>
        <Text>Package manager: <Text color="cyan">{config.packageManager}</Text></Text>
        <Text>Workspace: <Text color="cyan">{config.workspaceRoot}</Text></Text>
        <Text>Dotfiles repo: <Text color="cyan">{config.dotfilesRepo}</Text></Text>
        <Text>Contexts: <Text color="cyan">{config.contexts.map(c => c.label).join(', ')}</Text></Text>
        <Text>Secrets backend: <Text color="cyan">{config.secretsBackend}</Text></Text>
        <Text>Tools: <Text color="cyan">{config.tools.length === 0 ? 'none' : config.tools.join(', ')}</Text></Text>
      </Box>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={async (item) => {
            if (item.value === 'cancel') {
              onComplete();
              return;
            }
            setStatus('writing');
            try {
              const path = await writeConfig(config, config.dotfilesRepo);
              setOutputPath(path);
              setStatus('done');
              setTimeout(onComplete, 2000);
            } catch (e) {
              setError((e as Error).message);
              setStatus('error');
            }
          }}
        />
      </Box>
    </Box>
  );
}
