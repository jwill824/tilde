import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { ConfigurationDomains } from '../config/schema.js';

interface Props {
  onComplete: (data: { configurations: ConfigurationDomains }) => void;
}

const DOMAINS: { key: keyof ConfigurationDomains; label: string }[] = [
  { key: 'git', label: 'git — Manage .gitconfig and context overrides' },
  { key: 'vscode', label: 'vscode — Manage VS Code settings/profiles' },
  { key: 'aliases', label: 'aliases — Manage shell aliases file' },
  { key: 'osDefaults', label: 'osDefaults — Apply macOS defaults write commands' },
  { key: 'direnv', label: 'direnv — Install direnv + generate .envrc files' },
];

export function AppConfigStep({ onComplete }: Props) {
  const [cursor, setCursor] = useState(0);
  const [enabled, setEnabled] = useState<ConfigurationDomains>({
    git: true,
    vscode: false,
    aliases: false,
    osDefaults: false,
    direnv: true,
  });

  useInput((input, key) => {
    if (key.upArrow) setCursor(c => Math.max(0, c - 1));
    if (key.downArrow) setCursor(c => Math.min(DOMAINS.length - 1, c + 1));
    if (input === ' ') {
      const domain = DOMAINS[cursor].key;
      setEnabled(prev => ({ ...prev, [domain]: !prev[domain] }));
    }
    if (key.return) {
      onComplete({ configurations: enabled });
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold>Which configuration domains should tilde manage?</Text>
      <Text dimColor>Space to toggle, Enter to confirm</Text>
      <Box flexDirection="column" marginTop={1}>
        {DOMAINS.map((d, idx) => (
          <Box key={d.key}>
            <Text color={idx === cursor ? 'cyan' : undefined}>
              {idx === cursor ? '❯ ' : '  '}
              {enabled[d.key] ? '[x] ' : '[ ] '}
              {d.label}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
