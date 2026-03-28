import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import type { DeveloperContext } from '../config/schema.js';

interface Props {
  workspaceRoot: string;
  onComplete: (data: { contexts: DeveloperContext[] }) => void;
  defaultGitName?: string;
  defaultGitEmail?: string;
}

type Phase =
  | { type: 'label' }
  | { type: 'path'; label: string }
  | { type: 'gitName'; label: string; path: string }
  | { type: 'gitEmail'; label: string; path: string; gitName: string }
  | { type: 'loop' };

export function ContextsStep({ workspaceRoot, onComplete, defaultGitName = '', defaultGitEmail = '' }: Props) {
  const [contexts, setContexts] = useState<DeveloperContext[]>([]);
  const [phase, setPhase] = useState<Phase>({ type: 'label' });
  const [error, setError] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [pathInput, setPathInput] = useState('');
  const [gitNameInput, setGitNameInput] = useState(defaultGitName);
  const [gitEmailInput, setGitEmailInput] = useState(defaultGitEmail);

  if (phase.type === 'label') {
    return (
      <Box flexDirection="column">
        <Text bold>Add a developer context</Text>
        <Text dimColor>A context is a named workspace boundary (e.g., "personal", "work")</Text>
        {error ? <Text color="red">{error}</Text> : null}
        <Box marginTop={1}>
          <Text>Context label: </Text>
          <TextInput
            value={labelInput}
            onChange={setLabelInput}
            onSubmit={(v) => {
              const trimmed = v.trim();
              if (!trimmed) { setError('Label cannot be empty'); return; }
              const isDupe = contexts.some(c => c.label === trimmed);
              if (isDupe) { setError(`Label "${trimmed}" already exists`); return; }
              setError('');
              setPathInput(`${workspaceRoot}/${trimmed}`);
              setPhase({ type: 'path', label: trimmed });
            }}
            placeholder="personal"
          />
        </Box>
      </Box>
    );
  }

  if (phase.type === 'path') {
    return (
      <Box flexDirection="column">
        <Text bold>Context path for <Text color="cyan">{phase.label}</Text>:</Text>
        <Box marginTop={1}>
          <TextInput
            value={pathInput}
            onChange={setPathInput}
            onSubmit={(v) => {
              setPhase({ type: 'gitName', label: phase.label, path: v || pathInput });
            }}
            placeholder={`${workspaceRoot}/${phase.label}`}
          />
        </Box>
      </Box>
    );
  }

  if (phase.type === 'gitName') {
    return (
      <Box flexDirection="column">
        <Text bold>Git name for <Text color="cyan">{phase.label}</Text>:</Text>
        <Box marginTop={1}>
          <TextInput
            value={gitNameInput}
            onChange={setGitNameInput}
            onSubmit={(v) => {
              if (!v.trim()) return;
              setPhase({ type: 'gitEmail', label: phase.label, path: phase.path, gitName: v.trim() });
            }}
            placeholder="Your Name"
          />
        </Box>
      </Box>
    );
  }

  if (phase.type === 'gitEmail') {
    return (
      <Box flexDirection="column">
        <Text bold>Git email for <Text color="cyan">{phase.label}</Text>:</Text>
        <Box marginTop={1}>
          <TextInput
            value={gitEmailInput}
            onChange={setGitEmailInput}
            onSubmit={(v) => {
              if (!v.trim()) return;
              const newCtx: DeveloperContext = {
                label: phase.label,
                path: phase.path,
                git: { name: phase.gitName, email: v.trim() },
                authMethod: 'gh-cli',
                envVars: [],
              };
              setContexts(prev => [...prev, newCtx]);
              setLabelInput('');
              setPathInput('');
              setGitNameInput('');
              setGitEmailInput('');
              setPhase({ type: 'loop' });
            }}
            placeholder="you@example.com"
          />
        </Box>
      </Box>
    );
  }

  // phase.type === 'loop': ask to add more or finish
  const loopItems = [
    { label: 'Add another context', value: 'add' },
    { label: `Done (${contexts.length} context${contexts.length !== 1 ? 's' : ''} added)`, value: 'done' },
  ];

  return (
    <Box flexDirection="column">
      <Text bold>Contexts defined:</Text>
      {contexts.map(c => (
        <Box key={c.label} marginLeft={2}>
          <Text>• <Text color="cyan">{c.label}</Text> — {c.path} ({c.git.email})</Text>
        </Box>
      ))}
      <Box marginTop={1}>
        <SelectInput
          items={loopItems}
          onSelect={(item) => {
            if (item.value === 'add') {
              setPhase({ type: 'label' });
            } else {
              onComplete({ contexts });
            }
          }}
        />
      </Box>
    </Box>
  );
}
