import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { PluginError } from '../plugins/api.js';

type RecoveryChoice = 'retry' | 'skip' | 'abort';

interface Props {
  error: PluginError;
  onRecover: (choice: RecoveryChoice) => void;
  canRetry?: boolean;
  canSkip?: boolean;
}

export function ErrorDisplay({ error, onRecover, canRetry = true, canSkip = true }: Props) {
  const items = [
    ...(canRetry ? [{ label: 'Retry', value: 'retry' }] : []),
    ...(canSkip ? [{ label: 'Skip this step', value: 'skip' }] : []),
    { label: 'Abort setup', value: 'abort' },
  ];

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="red">
          {error.severity === 'warning' ? '⚠ Warning' : '✗ Error'}
          {' — '}
          {error.pluginId}
        </Text>
      </Box>

      <Text>{error.message}</Text>

      {error.code && (
        <Box marginTop={1}>
          <Text dimColor>Code: {error.code}</Text>
        </Box>
      )}

      {error.originalError && (
        <Box marginTop={1}>
          <Text dimColor>
            Caused by: {error.originalError.message}
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>How would you like to proceed?</Text>
      </Box>

      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={(item) => onRecover(item.value as RecoveryChoice)}
        />
      </Box>
    </Box>
  );
}
