import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';

interface Props {
  onComplete: (data: { workspaceRoot: string; dotfilesRepo: string }) => void;
  onBack?: () => void;
  isOptional?: boolean;
  initialValues?: Record<string, unknown>;
}

type Field = 'workspaceRoot' | 'dotfilesRepo';

export function WorkspaceStep({ onComplete, onBack, isOptional: _isOptional, initialValues = {} }: Props) {
  const [field, setField] = useState<Field>('workspaceRoot');
  const [workspaceRoot, setWorkspaceRoot] = useState(() => (initialValues.workspaceRoot as string) ?? '~/Developer');
  const [dotfilesRepo, setDotfilesRepo] = useState(() => (initialValues.dotfilesRepo as string) ?? '');
  const [error, setError] = useState('');
  // Gate: show back option before entering text input so back nav doesn't conflict with typing
  const [editing, setEditing] = useState(false);

  const validatePath = (p: string): boolean =>
    p.startsWith('/') || p.startsWith('~/');

  // Pre-gate SelectInput — shown before text entry begins
  if (!editing) {
    const gateItems = [
      { label: `Enter ${field === 'workspaceRoot' ? 'workspace root' : 'dotfiles repo'} →`, value: 'edit' },
      ...(onBack ? [{ label: '← Back', value: 'back' }] : []),
    ];
    const prompt = field === 'workspaceRoot'
      ? `Workspace root (current: ${workspaceRoot})`
      : `Dotfiles repo (current: ${dotfilesRepo || 'auto'})`;
    return (
      <Box flexDirection="column">
        <Text bold>Where is your workspace root?</Text>
        <Text dimColor>{prompt}</Text>
        <Box marginTop={1}>
          <SelectInput
            items={gateItems}
            onSelect={(item) => {
              if (item.value === 'back') { onBack?.(); return; }
              setEditing(true);
            }}
          />
        </Box>
      </Box>
    );
  }

  if (field === 'workspaceRoot') {
    return (
      <Box flexDirection="column">
        <Text bold>Where is your workspace root?</Text>
        <Text dimColor>The parent directory for all your projects (Enter to confirm)</Text>
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
              setEditing(false);
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
      <Text dimColor>The git repo where tilde.config.json will be written (Enter to confirm)</Text>
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
