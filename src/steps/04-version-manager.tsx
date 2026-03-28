import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { VersionManagerChoice } from '../config/schema.js';

interface Props {
  onComplete: (data: { versionManagers: VersionManagerChoice[] }) => void;
}

const OPTIONS = ['vfox', 'nvm', 'pyenv', 'sdkman'] as const;
type VMName = typeof OPTIONS[number];

export function VersionManagerStep({ onComplete }: Props) {
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<VMName>>(new Set(['vfox']));

  useInput((input, key) => {
    if (key.upArrow) setCursor(c => Math.max(0, c - 1));
    if (key.downArrow) setCursor(c => Math.min(OPTIONS.length - 1, c + 1));
    if (input === ' ') {
      const opt = OPTIONS[cursor];
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(opt)) next.delete(opt);
        else next.add(opt);
        return next;
      });
    }
    if (key.return) {
      onComplete({
        versionManagers: Array.from(selected).map(name => ({ name })),
      });
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold>Which version managers do you want?</Text>
      <Text dimColor>Space to toggle, Enter to confirm</Text>
      <Box flexDirection="column" marginTop={1}>
        {OPTIONS.map((opt, idx) => (
          <Box key={opt}>
            <Text color={idx === cursor ? 'cyan' : undefined}>
              {idx === cursor ? '❯ ' : '  '}
              {selected.has(opt) ? '[x] ' : '[ ] '}
              {opt}
            </Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Selected: {selected.size === 0 ? 'none' : Array.from(selected).join(', ')}</Text>
      </Box>
    </Box>
  );
}
