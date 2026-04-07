import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import type { DeveloperContext } from '../config/schema.js';

interface Props {
  onComplete: (data: { workspaceRoot: string; dotfilesRepo: string; contexts: DeveloperContext[] }) => void;
  defaultGitName?: string;
  defaultGitEmail?: string;
  /** Pre-existing contexts from wizard history — triggers list view when non-empty */
  initialContexts?: DeveloperContext[];
  onBack?: () => void;
  isOptional?: boolean;
  initialValues?: Record<string, unknown>;
}

type AuthMethod = 'gh-cli' | 'https' | 'ssh';

type Phase =
  | 'workspace-root'   // gate + TextInput for root workspace dir
  | 'list'             // context list view (when re-entering step)
  | 'label'            // gate + TextInput for context label
  | 'path'             // gate + TextInput for context path
  | 'git-name'         // gate + TextInput for git name
  | 'git-email'        // gate + TextInput for git email
  | 'auth-method'      // SelectInput — no gate needed
  | 'account'          // gate + TextInput for GitHub username (conditional)
  | 'dotfiles'         // gate + TextInput for dotfiles path (optional)
  | 'loop';            // "Add another?" SelectInput

interface ContextForm {
  label: string;
  path: string;
  gitName: string;
  gitEmail: string;
  authMethod: AuthMethod;
  account: string;
  dotfilesPath: string;
}

const EMPTY_FORM: ContextForm = {
  label: '',
  path: '',
  gitName: '',
  gitEmail: '',
  authMethod: 'gh-cli',
  account: '',
  dotfilesPath: '',
};

// ---------------------------------------------------------------------------
// ContextListView sub-component
// ---------------------------------------------------------------------------

interface ContextListViewProps {
  contexts: DeveloperContext[];
  onAddNew: () => void;
  onRemoveContext: (label: string) => void;
  onDone: () => void;
  onBack?: () => void;
}

function ContextListView({ contexts, onAddNew, onRemoveContext, onDone, onBack }: ContextListViewProps) {
  const items = [
    { label: '+ Add another context', value: 'add' },
    ...contexts.map(c => ({ label: `✕ Remove: ${c.label}`, value: `remove:${c.label}` })),
    { label: `✓ Done (${contexts.length} context${contexts.length !== 1 ? 's' : ''})`, value: 'done' },
    ...(onBack ? [{ label: '← Back', value: 'back' }] : []),
  ];
  return (
    <Box flexDirection="column">
      <Text bold>Workspace Contexts</Text>
      <Box flexDirection="column" marginTop={1}>
        {contexts.map(c => (
          <Box key={c.label} marginLeft={2}>
            <Text>• <Text color="cyan">{c.label}</Text> — {c.path} <Text dimColor>({c.authMethod})</Text></Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={(item) => {
            if (item.value === 'done') { onDone(); return; }
            if (item.value === 'add') { onAddNew(); return; }
            if (item.value === 'back' && onBack) { onBack(); return; }
            if (item.value.startsWith('remove:')) { onRemoveContext(item.value.slice(7)); }
          }}
        />
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// GateInput — reusable gate+TextInput pattern
// ---------------------------------------------------------------------------

interface GateInputProps {
  prompt: string;
  hint?: string;
  currentValue: string;
  placeholder: string;
  onConfirm: (value: string) => void;
  onBack?: () => void;
  backLabel?: string;
  skipLabel?: string;
  onSkip?: () => void;
  error?: string;
}

function GateInput({ prompt, hint, currentValue, placeholder, onConfirm, onBack, backLabel = '← Back', skipLabel, onSkip, error }: GateInputProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentValue);

  if (!editing) {
    const items = [
      { label: `${prompt}${currentValue ? ` (${currentValue})` : ''} →`, value: 'edit' },
      ...(onSkip ? [{ label: skipLabel ?? 'Skip →', value: 'skip' }] : []),
      ...(onBack ? [{ label: backLabel, value: 'back' }] : []),
    ];
    return (
      <Box flexDirection="column">
        {hint && <Text dimColor>{hint}</Text>}
        {error && <Text color="red">{error}</Text>}
        <Box marginTop={1}>
          <SelectInput
            items={items}
            onSelect={(item) => {
              if (item.value === 'back' && onBack) { onBack(); return; }
              if (item.value === 'skip' && onSkip) { onSkip(); return; }
              setEditing(true);
            }}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {hint && <Text dimColor>{hint}</Text>}
      {error && <Text color="red">{error}</Text>}
      <Box marginTop={1}>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={(v) => {
            setEditing(false);
            onConfirm(v || value);
          }}
          placeholder={placeholder}
        />
      </Box>
      <Text dimColor>(Enter to confirm)</Text>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// ContextsStep — unified workspace + context + auth + accounts
// ---------------------------------------------------------------------------

export function ContextsStep({
  onComplete,
  defaultGitName = '',
  defaultGitEmail = '',
  initialContexts = [],
  onBack,
  isOptional: _isOptional,
  initialValues = {},
}: Props) {
  const [workspaceRoot, setWorkspaceRoot] = useState(
    () => (initialValues.workspaceRoot as string) ?? '~/Developer'
  );
  const [contexts, setContexts] = useState<DeveloperContext[]>(initialContexts);
  const [phase, setPhase] = useState<Phase>(
    initialContexts.length > 0 ? 'list' : 'workspace-root'
  );
  const [form, setForm] = useState<ContextForm>({ ...EMPTY_FORM, gitName: defaultGitName, gitEmail: defaultGitEmail });
  const [error, setError] = useState('');

  function resetForm() {
    setForm({ ...EMPTY_FORM, gitName: defaultGitName, gitEmail: defaultGitEmail });
    setError('');
  }

  function completeContext() {
    const needsAccount = form.authMethod === 'gh-cli' || form.authMethod === 'https';
    const ctx: DeveloperContext = {
      label: form.label,
      path: form.path,
      git: { name: form.gitName, email: form.gitEmail },
      authMethod: form.authMethod,
      envVars: [],
      languageBindings: [],
      ...(needsAccount && form.account ? { github: { username: form.account } } : {}),
      ...(form.dotfilesPath ? { dotfilesPath: form.dotfilesPath } : {}),
    };
    setContexts(prev => [...prev, ctx]);
    resetForm();
    setPhase('loop');
  }

  function finishWizard(finalContexts: DeveloperContext[]) {
    const primary = finalContexts[0];
    const dotfilesRepo = primary?.dotfilesPath || `${workspaceRoot}/personal/dotfiles`;
    onComplete({ workspaceRoot, dotfilesRepo, contexts: finalContexts });
  }

  // ── workspace-root ─────────────────────────────────────────────────────────
  if (phase === 'workspace-root') {
    return (
      <Box flexDirection="column">
        <Text bold>Where is your workspace root?</Text>
        <GateInput
          prompt="Set workspace root"
          hint="The parent directory for all your projects (default: ~/Developer)"
          currentValue={workspaceRoot}
          placeholder="~/Developer"
          onConfirm={(v) => {
            const path = v.trim() || '~/Developer';
            if (!path.startsWith('/') && !path.startsWith('~/')) {
              setError('Path must be absolute or start with ~/');
              return;
            }
            setWorkspaceRoot(path);
            setPhase('label');
          }}
          onBack={onBack}
          error={error}
        />
      </Box>
    );
  }

  // ── list ───────────────────────────────────────────────────────────────────
  if (phase === 'list') {
    return (
      <ContextListView
        contexts={contexts}
        onAddNew={() => {
          resetForm();
          setPhase('label');
        }}
        onRemoveContext={(label) => setContexts(prev => prev.filter(c => c.label !== label))}
        onDone={() => finishWizard(contexts)}
        onBack={onBack}
      />
    );
  }

  // ── label ──────────────────────────────────────────────────────────────────
  if (phase === 'label') {
    return (
      <Box flexDirection="column">
        <Text bold>Add a developer context</Text>
        <Text dimColor>A context is a named workspace boundary (e.g., "personal", "work")</Text>
        <GateInput
          prompt="Context name"
          currentValue={form.label}
          placeholder="personal"
          onConfirm={(v) => {
            const trimmed = v.trim();
            if (!trimmed) { setError('Label cannot be empty'); return; }
            if (contexts.some(c => c.label === trimmed)) { setError(`"${trimmed}" already exists`); return; }
            setError('');
            setForm(f => ({
              ...f,
              label: trimmed,
              path: f.path || `${workspaceRoot}/${trimmed}`,
            }));
            setPhase('path');
          }}
          onBack={() => contexts.length > 0 ? setPhase('list') : setPhase('workspace-root')}
          backLabel={contexts.length > 0 ? '← Back to list' : '← Back to workspace'}
          error={error}
        />
      </Box>
    );
  }

  // ── path ───────────────────────────────────────────────────────────────────
  if (phase === 'path') {
    const defaultPath = `${workspaceRoot}/${form.label}`;
    return (
      <Box flexDirection="column">
        <Text bold>Context path for <Text color="cyan">{form.label}</Text>:</Text>
        <GateInput
          prompt="Set path"
          hint={`Where ${form.label} projects live`}
          currentValue={form.path || defaultPath}
          placeholder={defaultPath}
          onConfirm={(v) => {
            setForm(f => ({ ...f, path: v.trim() || defaultPath }));
            setPhase('git-name');
          }}
          onBack={() => setPhase('label')}
        />
      </Box>
    );
  }

  // ── git-name ───────────────────────────────────────────────────────────────
  if (phase === 'git-name') {
    return (
      <Box flexDirection="column">
        <Text bold>Git identity for <Text color="cyan">{form.label}</Text>:</Text>
        <GateInput
          prompt="Git name"
          hint="Your full name for git commits in this context"
          currentValue={form.gitName}
          placeholder="Your Name"
          onConfirm={(v) => {
            if (!v.trim()) { setError('Git name cannot be empty'); return; }
            setError('');
            setForm(f => ({ ...f, gitName: v.trim() }));
            setPhase('git-email');
          }}
          onBack={() => setPhase('path')}
          error={error}
        />
      </Box>
    );
  }

  // ── git-email ──────────────────────────────────────────────────────────────
  if (phase === 'git-email') {
    return (
      <Box flexDirection="column">
        <Text bold>Git email for <Text color="cyan">{form.label}</Text>:</Text>
        <GateInput
          prompt="Git email"
          hint="Your email for git commits in this context"
          currentValue={form.gitEmail}
          placeholder="you@example.com"
          onConfirm={(v) => {
            if (!v.trim()) { setError('Git email cannot be empty'); return; }
            setError('');
            setForm(f => ({ ...f, gitEmail: v.trim() }));
            setPhase('auth-method');
          }}
          onBack={() => setPhase('git-name')}
          error={error}
        />
      </Box>
    );
  }

  // ── auth-method ────────────────────────────────────────────────────────────
  if (phase === 'auth-method') {
    const items = [
      { label: 'gh-cli (recommended — GitHub CLI manages auth)', value: 'gh-cli' },
      { label: 'https (username + token)', value: 'https' },
      { label: 'ssh (SSH key)', value: 'ssh' },
      { label: '← Back', value: 'back' },
    ];
    return (
      <Box flexDirection="column">
        <Text bold>Git auth method for <Text color="cyan">{form.label}</Text>:</Text>
        <Text dimColor>How to authenticate with remote git repositories</Text>
        <Box marginTop={1}>
          <SelectInput
            items={items}
            onSelect={(item) => {
              if (item.value === 'back') { setPhase('git-email'); return; }
              const method = item.value as AuthMethod;
              setForm(f => ({ ...f, authMethod: method }));
              const needsAccount = method === 'gh-cli' || method === 'https';
              setPhase(needsAccount ? 'account' : 'dotfiles');
            }}
          />
        </Box>
      </Box>
    );
  }

  // ── account ────────────────────────────────────────────────────────────────
  if (phase === 'account') {
    return (
      <Box flexDirection="column">
        <Text bold>GitHub account for <Text color="cyan">{form.label}</Text>:</Text>
        <GateInput
          prompt="GitHub username"
          hint="Your GitHub username for this context"
          currentValue={form.account}
          placeholder="your-github-username"
          onConfirm={(v) => {
            setForm(f => ({ ...f, account: v.trim() }));
            setPhase('dotfiles');
          }}
          onBack={() => setPhase('auth-method')}
        />
      </Box>
    );
  }

  // ── dotfiles ───────────────────────────────────────────────────────────────
  if (phase === 'dotfiles') {
    const defaultDotfiles = `${form.path}/dotfiles`;
    const isFirst = contexts.length === 0;
    return (
      <Box flexDirection="column">
        <Text bold>Dotfiles path for <Text color="cyan">{form.label}</Text>:</Text>
        <GateInput
          prompt="Dotfiles path"
          hint={isFirst ? 'Where your tilde config and dotfiles live (becomes dotfilesRepo)' : 'Where context-specific dotfiles live (optional)'}
          currentValue={form.dotfilesPath || defaultDotfiles}
          placeholder={defaultDotfiles}
          onConfirm={(v) => {
            setForm(f => ({ ...f, dotfilesPath: v.trim() || defaultDotfiles }));
            completeContext();
          }}
          onSkip={() => {
            completeContext();
          }}
          skipLabel="Skip (use default)"
          onBack={() => {
            const needsAccount = form.authMethod === 'gh-cli' || form.authMethod === 'https';
            setPhase(needsAccount ? 'account' : 'auth-method');
          }}
        />
      </Box>
    );
  }

  // ── loop ───────────────────────────────────────────────────────────────────
  const loopItems = [
    { label: '+ Add another context', value: 'add' },
    { label: `✓ Done (${contexts.length} context${contexts.length !== 1 ? 's' : ''})`, value: 'done' },
    { label: '← Review contexts', value: 'review' },
  ];

  return (
    <Box flexDirection="column">
      <Text bold>Contexts so far:</Text>
      {contexts.map(c => (
        <Box key={c.label} marginLeft={2}>
          <Text>• <Text color="cyan">{c.label}</Text> — {c.path} <Text dimColor>({c.authMethod})</Text></Text>
        </Box>
      ))}
      <Box marginTop={1}>
        <SelectInput
          items={loopItems}
          onSelect={(item) => {
            if (item.value === 'add') { resetForm(); setPhase('label'); }
            else if (item.value === 'review') { setPhase('list'); }
            else { finishWizard(contexts); }
          }}
        />
      </Box>
    </Box>
  );
}


