import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import type { DeveloperContext } from '../config/schema.js';

interface Props {
  contexts: DeveloperContext[];
  onComplete: (data: { contexts: DeveloperContext[] }) => void;
  onBack?: () => void;
  isOptional?: boolean;
  initialValues?: Record<string, unknown>;
}

type AuthMethod = 'gh-cli' | 'https' | 'ssh';

const AUTH_OPTIONS = [
  { label: 'gh-cli (GitHub CLI — recommended)', value: 'gh-cli' },
  { label: 'HTTPS (token-based)', value: 'https' },
  { label: 'SSH (key-based)', value: 'ssh' },
];

export function GitAuthStep({ contexts, onComplete, onBack, isOptional: _isOptional, initialValues = {} }: Props) {
  const [idx, setIdx] = useState(0);
  const savedContexts = initialValues.contexts as DeveloperContext[] | undefined;
  const [updatedContexts, setUpdatedContexts] = useState<DeveloperContext[]>(savedContexts ?? [...contexts]);

  if (idx >= contexts.length) {
    return (
      <Box flexDirection="column">
        <Text>Git auth configured for all contexts.</Text>
      </Box>
    );
  }

  const ctx = contexts[idx];
  const savedAuthIdx = AUTH_OPTIONS.findIndex(o => o.value === updatedContexts[idx]?.authMethod);

  return (
    <Box flexDirection="column">
      <Text bold>Git auth for context: <Text color="cyan">{ctx.label}</Text></Text>
      <Text dimColor>How will you authenticate with remote git repositories?</Text>
      <Box marginTop={1}>
        <SelectInput
          items={[
            ...AUTH_OPTIONS,
            ...(onBack && idx === 0 ? [{ label: '← Back', value: '__back__' }] : []),
          ]}
          initialIndex={savedAuthIdx >= 0 ? savedAuthIdx : 0}
          onSelect={(item) => {
            if (item.value === '__back__' && onBack) { onBack(); return; }
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
