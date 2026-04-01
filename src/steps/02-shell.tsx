import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

interface Props {
  onComplete: (data: { shell: 'zsh' | 'bash' | 'fish' }) => void;
  defaultShell?: 'zsh' | 'bash' | 'fish';
  onBack?: () => void;
  isOptional?: boolean;
}

const items = [
  { label: 'zsh (recommended)', value: 'zsh' },
  { label: 'bash', value: 'bash' },
  { label: 'fish', value: 'fish' },
];

export function ShellStep({ onComplete, defaultShell = 'zsh', onBack: _onBack, isOptional: _isOptional }: Props) {
  return (
    <Box flexDirection="column">
      <Text bold>Which shell do you use?</Text>
      <Text dimColor>Use ↑↓ to navigate, Enter to select</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          initialIndex={items.findIndex(i => i.value === defaultShell)}
          onSelect={(item) => onComplete({ shell: item.value as 'zsh' | 'bash' | 'fish' })}
        />
      </Box>
    </Box>
  );
}
