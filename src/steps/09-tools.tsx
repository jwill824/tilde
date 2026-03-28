import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface Props {
  onComplete: (data: { tools: string[]; configurations: { direnv: boolean } }) => void;
}

export function ToolsStep({ onComplete }: Props) {
  const [toolInput, setToolInput] = useState('');
  const direnv = true; // direnv pre-checked per FR-006

  return (
    <Box flexDirection="column">
      <Text bold>Additional tools to install:</Text>
      <Text dimColor>Comma-separated Homebrew formula/cask names (leave blank for none)</Text>
      <Text dimColor>direnv is pre-selected ✓</Text>
      <Box marginTop={1}>
        <TextInput
          value={toolInput}
          onChange={setToolInput}
          onSubmit={(v) => {
            const tools = v
              .split(',')
              .map(t => t.trim())
              .filter(Boolean);
            if (direnv && !tools.includes('direnv')) {
              tools.unshift('direnv');
            }
            onComplete({ tools, configurations: { direnv } });
          }}
          placeholder="git-delta, ripgrep, fzf"
        />
      </Box>
    </Box>
  );
}
