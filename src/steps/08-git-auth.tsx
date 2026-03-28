import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import type { DeveloperContext } from '../config/schema.js';

interface Props {
  contexts: DeveloperContext[];
  onComplete: (data: { contexts: DeveloperContext[] }) => void;
}

type AuthMethod = 'gh-cli' | 'https' | 'ssh';

const AUTH_OPTIONS = [
  { label: 'gh-cli (GitHub CLI — recommended)', value: 'gh-cli' },
  { label: 'HTTPS (token-based)', value: 'https' },
  { label: 'SSH (key-based)', value: 'ssh' },
];

export function GitAuthStep({ contexts, onComplete }: Props) {
  const [idx, setIdx] = useState(0);
  const [updatedContexts, setUpdatedContexts] = useState<DeveloperContext[]>([...contexts]);

  if (idx >= contexts.length) {
    return (
      <Box flexDirection="column">
        <Text>Git auth configured for all contexts.</Text>
      </Box>
    );
  }

  const ctx = contexts[idx];

  return (
    <Box flexDirection="column">
      <Text bold>Git auth for context: <Text color="cyan">{ctx.label}</Text></Text>
      <Text dimColor>How will you authenticate with remote git repositories?</Text>
      <Box marginTop={1}>
        <SelectInput
          items={AUTH_OPTIONS}
          initialIndex={0}
          onSelect={(item) => {
            const updated = updatedContexts.map((c, i) =>
              i === idx ? { ...c, authMethod: item.value as AuthMethod } : c
            );
            setUpdatedContexts(updated);
            if (idx + 1 >= contexts.length) {
              onComplete({ contexts: updated });
            } else {
              setIdx(i => i + 1);
            }
          }}
        />
      </Box>
    </Box>
  );
}
