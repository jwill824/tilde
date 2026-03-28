import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface Props {
  onComplete: (data: { workspaceRoot: string; dotfilesRepo: string }) => void;
}

type Field = 'workspaceRoot' | 'dotfilesRepo';

export function WorkspaceStep({ onComplete }: Props) {
  const [field, setField] = useState<Field>('workspaceRoot');
  const [workspaceRoot, setWorkspaceRoot] = useState('~/Developer');
  const [dotfilesRepo, setDotfilesRepo] = useState('');
  const [error, setError] = useState('');

  const validatePath = (p: string): boolean =>
    p.startsWith('/') || p.startsWith('~/');

  if (field === 'workspaceRoot') {
    return (
      <Box flexDirection="column">
        <Text bold>Where is your workspace root?</Text>
        <Text dimColor>The parent directory for all your projects</Text>
        {error ? <Text color="red">{error}</Text> : null}
        <Box marginTop={1}>
          <TextInput
            value={workspaceRoot}
            onChange={setWorkspaceRoot}
            onSubmit={(v) => {
              if (!validatePath(v)) {
                setError('Path must be absolute or start with ~/');
                return;
              }
              setError('');
              setDotfilesRepo(`${v}/personal/dotfiles`);
              setField('dotfilesRepo');
            }}
            placeholder="~/Developer"
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>Where is your dotfiles repo?</Text>
      <Text dimColor>The git repo where tilde.config.json will be written</Text>
      {error ? <Text color="red">{error}</Text> : null}
      <Box marginTop={1}>
        <TextInput
          value={dotfilesRepo}
          onChange={setDotfilesRepo}
          onSubmit={(v) => {
            if (!validatePath(v)) {
              setError('Path must be absolute or start with ~/');
              return;
            }
            setError('');
            onComplete({ workspaceRoot, dotfilesRepo: v });
          }}
          placeholder="~/Developer/personal/dotfiles"
        />
      </Box>
    </Box>
  );
}
