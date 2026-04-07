import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

interface Props {
  onComplete: (data: { shell: 'zsh' | 'bash' | 'fish' }) => void;
  defaultShell?: 'zsh' | 'bash' | 'fish';
  onBack?: () => void;
  isOptional?: boolean;
  initialValues?: Record<string, unknown>;
}

const SHELL_OPTIONS = [
  { label: 'zsh (recommended)', value: 'zsh' },
  { label: 'bash', value: 'bash' },
  { label: 'fish', value: 'fish' },
];

export function ShellStep({ onComplete, defaultShell = 'zsh', onBack, isOptional: _isOptional }: Props) {
  const items = [...SHELL_OPTIONS, ...(onBack ? [{ label: '← Back', value: '__back__' }] : [])];
  return (
    <Box flexDirection="column">
      <Text bold>Which shell do you use?</Text>
      <Text dimColor>Use ↑↓ to navigate, Enter to select</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          initialIndex={SHELL_OPTIONS.findIndex(i => i.value === defaultShell)}
          onSelect={(item) => {
            if (item.value === '__back__' && onBack) { onBack(); return; }
            onComplete({ shell: item.value as 'zsh' | 'bash' | 'fish' });
          }}
        />
      </Box>
    </Box>
  );
}
