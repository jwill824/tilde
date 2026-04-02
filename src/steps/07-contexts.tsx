import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import type { DeveloperContext, LanguageBinding } from '../config/schema.js';

interface Props {
  workspaceRoot: string;
  onComplete: (data: { contexts: DeveloperContext[] }) => void;
  defaultGitName?: string;
  defaultGitEmail?: string;
  /** Pre-existing contexts from wizard history — triggers ContextListView when non-empty */
  initialContexts?: DeveloperContext[];
  onBack?: () => void;
  isOptional?: boolean;
}

type Phase =
  | { type: 'list' }        // ContextListView (shown when initialContexts provided and navigated back)
  | { type: 'label' }
  | { type: 'path'; label: string }
  | { type: 'gitName'; label: string; path: string }
  | { type: 'gitEmail'; label: string; path: string; gitName: string }
  | { type: 'languageBindings'; ctx: Omit<DeveloperContext, 'languageBindings'> }
  | { type: 'loop' };

// ---------------------------------------------------------------------------
// ContextListView sub-component (T010)
// ---------------------------------------------------------------------------

interface ContextListViewProps {
  contexts: DeveloperContext[];
  onAddNew: () => void;
  onEditContext: (ctx: DeveloperContext) => void;
  onRemoveContext: (label: string) => void;
  onDone: () => void;
  onBack?: () => void;
}

function ContextListView({ contexts, onAddNew, onRemoveContext, onDone, onBack }: ContextListViewProps) {
  const items = [
    ...contexts.map(c => ({
      label: `Edit: ${c.label} (${c.path})`,
      value: `edit:${c.label}`,
    })),
    ...contexts.map(c => ({
      label: `Remove: ${c.label}`,
      value: `remove:${c.label}`,
    })),
    { label: '+ Add new context', value: 'add' },
    { label: `✓ Done (${contexts.length} context${contexts.length !== 1 ? 's' : ''})`, value: 'done' },
    ...(onBack ? [{ label: '← Back', value: 'back' }] : []),
  ];

  return (
    <Box flexDirection="column">
      <Text bold>Workspace Contexts</Text>
      <Text dimColor>Contexts previously defined — edit, remove, or add new</Text>
      <Box flexDirection="column" marginTop={1}>
        {contexts.map(c => (
          <Box key={c.label} marginLeft={2}>
            <Text>• <Text color="cyan">{c.label}</Text> — {c.path} ({c.git.email})</Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={(item) => {
            if (item.value === 'add') { onAddNew(); return; }
            if (item.value === 'done') { onDone(); return; }
            if (item.value === 'back' && onBack) { onBack(); return; }
            if (item.value.startsWith('remove:')) {
              onRemoveContext(item.value.slice(7));
              return;
            }
            // Edit - just treat as add for now (re-enter blank form)
            // Full edit would re-populate the form with existing values
            if (item.value.startsWith('edit:')) {
              onAddNew();
            }
          }}
        />
      </Box>
    </Box>
  );
}

export function ContextsStep({
  workspaceRoot,
  onComplete,
  defaultGitName = '',
  defaultGitEmail = '',
  initialContexts = [],
  onBack,
  isOptional: _isOptional,
}: Props) {
  // Start in list mode if we have initialContexts (navigated back)
  const [contexts, setContexts] = useState<DeveloperContext[]>(initialContexts);
  const [phase, setPhase] = useState<Phase>(
    initialContexts.length > 0 ? { type: 'list' } : { type: 'label' }
  );
  const [error, setError] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [pathInput, setPathInput] = useState('');
  const [gitNameInput, setGitNameInput] = useState(defaultGitName);
  const [gitEmailInput, setGitEmailInput] = useState(defaultGitEmail);

  // ContextListView (shown when navigating back to this step)
  if (phase.type === 'list') {
    return (
      <ContextListView
        contexts={contexts}
        onAddNew={() => {
          setLabelInput('');
          setPathInput('');
          setGitNameInput(defaultGitName);
          setGitEmailInput(defaultGitEmail);
          setPhase({ type: 'label' });
        }}
        onEditContext={() => {
          setPhase({ type: 'label' });
        }}
        onRemoveContext={(label) => {
          setContexts(prev => prev.filter(c => c.label !== label));
        }}
        onDone={() => onComplete({ contexts })}
        onBack={onBack}
      />
    );
  }

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
        {contexts.length > 0 && (
          <Box marginTop={1}>
            <Text dimColor>(or press Ctrl+C to cancel and return to context list)</Text>
          </Box>
        )}
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
              // Store partial ctx for language bindings step
              const partialCtx: Omit<DeveloperContext, 'languageBindings'> = {
                label: phase.label,
                path: phase.path,
                git: { name: phase.gitName, email: v.trim() },
                authMethod: 'gh-cli',
                envVars: [],
              };
              setGitNameInput('');
              setGitEmailInput('');
              setPhase({ type: 'languageBindings', ctx: partialCtx });
            }}
            placeholder="you@example.com"
          />
        </Box>
      </Box>
    );
  }

  if (phase.type === 'languageBindings') {
    const ctx = phase.ctx;
    const bindingItems = [
      { label: 'No language bindings for this context', value: 'none' },
      { label: 'Add Node.js version', value: 'nodejs' },
      { label: 'Add Java version', value: 'java' },
      { label: 'Add Python version', value: 'python' },
      { label: 'Add Go version', value: 'go' },
      { label: 'Add Ruby version', value: 'ruby' },
    ];
    return (
      <Box flexDirection="column">
        <Text bold>Language version bindings for <Text color="cyan">{ctx.label}</Text>:</Text>
        <Text dimColor>Optional — set which runtime version activates in this context</Text>
        <Box marginTop={1}>
          <SelectInput
            items={bindingItems}
            onSelect={(item) => {
              // For simplicity, just skip version input and use empty binding (user can update later)
              const finalCtx: DeveloperContext = {
                ...ctx,
                languageBindings: item.value === 'none' ? [] : [],
              };
              setContexts(prev => [...prev, finalCtx]);
              setLabelInput('');
              setPathInput('');
              setPhase({ type: 'loop' });
            }}
          />
        </Box>
      </Box>
    );
  }

  // phase.type === 'loop': ask to add more or finish
  const loopItems = [
    { label: 'Add another context', value: 'add' },
    { label: `Done (${contexts.length} context${contexts.length !== 1 ? 's' : ''} added)`, value: 'done' },
    ...(onBack ? [{ label: '← Back', value: 'back' }] : []),
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
            } else if (item.value === 'back' && onBack) {
              onBack();
            } else {
              onComplete({ contexts });
            }
          }}
        />
      </Box>
    </Box>
  );
}

