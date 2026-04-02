import React, { useEffect } from 'react';
import { Box, Text } from 'ink';

interface Props {
  onComplete: (data: { packageManager: 'homebrew' }) => void;
  onBack?: () => void;
  isOptional?: boolean;
}

export function PackageManagerStep({ onComplete, onBack: _onBack, isOptional: _isOptional }: Props) {
  useEffect(() => {
    const t = setTimeout(() => onComplete({ packageManager: 'homebrew' }), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <Box flexDirection="column">
      <Text bold>Package manager:</Text>
      <Box marginLeft={2}>
        <Text color="green">✓ Homebrew</Text>
        <Text dimColor> (only supported package manager on macOS MVP)</Text>
      </Box>
    </Box>
  );
}
