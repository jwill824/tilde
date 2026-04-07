import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

type SecretsBackend = '1password' | 'keychain' | 'env-only';

interface Props {
  onComplete: (data: { secretsBackend: SecretsBackend }) => void;
  onBack?: () => void;
  isOptional?: boolean;
  initialValues?: Record<string, unknown>;
}

const items = [
  { label: '1Password (recommended)', value: '1password' },
  { label: 'macOS Keychain', value: 'keychain' },
  { label: 'Environment variables only (no secrets manager)', value: 'env-only' },
];

export function SecretsBackendStep({ onComplete, onBack: _onBack, isOptional: _isOptional, initialValues = {} }: Props) {
  const initialIndex = Math.max(0, items.findIndex(item => item.value === (initialValues.secretsBackend as string)));
  return (
    <Box flexDirection="column">
      <Text bold>Secrets backend:</Text>
      <Text dimColor>How should tilde reference secrets in generated configs?</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          initialIndex={initialIndex}
          onSelect={(item) => onComplete({ secretsBackend: item.value as SecretsBackend })}
        />
      </Box>
    </Box>
  );
}
