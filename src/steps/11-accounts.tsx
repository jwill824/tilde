import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import type { DeveloperContext } from '../config/schema.js';

interface Props {
  contexts: DeveloperContext[];
  onComplete: (data: { contexts: DeveloperContext[] }) => void;
  onBack?: () => void;
  isOptional?: boolean;
  onSkip?: () => void;
}

/** Auto-advances when there are no gh-cli contexts. */
function AutoSkip({ contexts, onComplete }: { contexts: DeveloperContext[]; onComplete: (data: { contexts: DeveloperContext[] }) => void }) {
  useEffect(() => {
    onComplete({ contexts });
  }, []);
  return <Box><Text dimColor>No gh-cli contexts — skipping account setup.</Text></Box>;
}

export function AccountsStep({ contexts, onComplete, onBack: _onBack, isOptional: _isOptional, onSkip: _onSkip }: Props) {
  const ghCliContexts = contexts.filter(c => c.authMethod === 'gh-cli');
  const [idx, setIdx] = useState(0);
  const [updatedContexts, setUpdatedContexts] = useState<DeveloperContext[]>([...contexts]);
  const [usernameInput, setUsernameInput] = useState('');

  if (ghCliContexts.length === 0) {
    return <AutoSkip contexts={contexts} onComplete={onComplete} />;
  }

  if (idx >= ghCliContexts.length) {
    return <Box><Text>Accounts configured.</Text></Box>;
  }

  const ctx = ghCliContexts[idx];

  return (
    <Box flexDirection="column">
      <Text bold>GitHub username for <Text color="cyan">{ctx.label}</Text>:</Text>
      <Box marginTop={1}>
        <TextInput
          value={usernameInput}
          onChange={setUsernameInput}
          onSubmit={(v) => {
            const trimmed = v.trim();
            const updated = updatedContexts.map(c =>
              c.label === ctx.label
                ? { ...c, github: { username: trimmed } }
                : c
            );
            setUpdatedContexts(updated);
            setUsernameInput('');
            if (idx + 1 >= ghCliContexts.length) {
              onComplete({ contexts: updated });
            } else {
              setIdx(i => i + 1);
            }
          }}
          placeholder="your-github-username"
        />
      </Box>
    </Box>
  );
}
