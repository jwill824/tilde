import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import type { DeveloperContext } from '../config/schema.js';
import { LANGUAGE_CATALOG, LANGUAGE_KEYS } from '../data/language-versions.js';

interface Props {
  onComplete: (data: { workspaceRoot: string; dotfilesRepo: string; contexts: DeveloperContext[] }) => void;
  defaultGitName?: string;
  defaultGitEmail?: string;
  /** Pre-existing contexts from wizard history — triggers list view when non-empty */
  initialContexts?: DeveloperContext[];
  /** Languages detected by env-capture scan — shown as suggestions in lang-gate */
  detectedLanguages?: Array<{ name: string; version: string }>;
  onBack?: () => void;
  isOptional?: boolean;
  initialValues?: Record<string, unknown>;
  /** Direct workspace root override (used by config-first and update modes) */
  workspaceRoot?: string;
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
  | 'lang-gate'        // SelectInput — add language bindings?
  | 'lang-select'      // SelectInput — choose a language
  | 'lang-manager'     // SelectInput — choose version manager
  | 'lang-version'     // SelectInput — choose version from catalog
  | 'lang-version-manual' // GateInput for manual version entry
  | 'lang-another'     // SelectInput — add another language?
  | 'loop';            // "Add another context?" SelectInput

interface LanguageBinding {
  runtime: string;
  version: string;
  manager: string;
}

interface ContextForm {
  label: string;
  path: string;
  gitName: string;
  gitEmail: string;
  authMethod: AuthMethod;
  account: string;
  dotfilesPath: string;
  langBindings: LanguageBinding[];
}

const EMPTY_FORM: ContextForm = {
  label: '',
  path: '',
  gitName: '',
  gitEmail: '',
  authMethod: 'gh-cli',
  account: '',
  dotfilesPath: '',
  langBindings: [],
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

function GateInput({ prompt, hint, currentValue, placeholder, onConfirm, onBack, backLabel = '← Back (b)', skipLabel, onSkip, error }: GateInputProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentValue);

  // Sync value state when currentValue prop changes (phase transitions may reuse same instance)
  useEffect(() => {
    setValue(currentValue);
    setEditing(false);
  }, [currentValue]);

  // Allow 'b' to go back when in gate (non-editing) mode
  useInput((input) => {
    if (input === 'b' && onBack && !editing) onBack();
  }, { isActive: !!onBack });

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
  detectedLanguages = [],
  onBack,
  isOptional: _isOptional,
  initialValues = {},
  workspaceRoot: workspaceRootProp,
}: Props) {
  const [workspaceRoot, setWorkspaceRoot] = useState(
    () => workspaceRootProp ?? (initialValues.workspaceRoot as string) ?? '~/Developer'
  );
  const [contexts, setContexts] = useState<DeveloperContext[]>(initialContexts);
  const [phase, setPhase] = useState<Phase>(
    initialContexts.length > 0 ? 'list' : 'workspace-root'
  );
  const [form, setForm] = useState<ContextForm>({ ...EMPTY_FORM, gitName: defaultGitName, gitEmail: defaultGitEmail });
  const [error, setError] = useState('');
  // Language sub-flow transient state
  const [currentLangKey, setCurrentLangKey] = useState('');
  const [currentManager, setCurrentManager] = useState('');

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
      languageBindings: form.langBindings,
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
            setPhase('lang-gate');
          }}
          onSkip={() => {
            setPhase('lang-gate');
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

  // ── lang-gate ──────────────────────────────────────────────────────────────
  if (phase === 'lang-gate') {
    const alreadyAdded = new Set(form.langBindings.map(lb => lb.runtime));
    const suggestions = detectedLanguages.filter(dl => !alreadyAdded.has(dl.name));
    const langItems = [
      { label: '+ Add language versions for this context', value: 'add' },
      { label: '→ Done (skip language bindings)', value: 'skip' },
      { label: '← Back to dotfiles', value: 'back' },
    ];
    return (
      <Box flexDirection="column">
        <Text bold>Language versions for <Text color="cyan">{form.label}</Text>:</Text>
        {suggestions.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            <Text dimColor>Detected on this machine:</Text>
            {suggestions.map(dl => (
              <Box key={dl.name} marginLeft={2}>
                <Text dimColor>• {LANGUAGE_CATALOG[dl.name]?.label ?? dl.name} {dl.version}</Text>
              </Box>
            ))}
          </Box>
        )}
        {form.langBindings.length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            {form.langBindings.map(lb => (
              <Box key={lb.runtime} marginLeft={2}>
                <Text>• {LANGUAGE_CATALOG[lb.runtime]?.label ?? lb.runtime} <Text dimColor>{lb.version} via {lb.manager}</Text></Text>
              </Box>
            ))}
          </Box>
        )}
        <Box marginTop={1}>
          <SelectInput items={langItems} onSelect={(item) => {
            if (item.value === 'add') { setPhase('lang-select'); }
            else if (item.value === 'back') { setPhase('dotfiles'); }
            else { completeContext(); }
          }} />
        </Box>
      </Box>
    );
  }

  // ── lang-select ────────────────────────────────────────────────────────────
  if (phase === 'lang-select') {
    const alreadyAdded = new Set(form.langBindings.map(lb => lb.runtime));
    const langItems = LANGUAGE_KEYS
      .filter(k => !alreadyAdded.has(k))
      .map(k => ({ label: LANGUAGE_CATALOG[k].label, value: k }));
    langItems.push({ label: '← Back', value: '__back__' });
    return (
      <Box flexDirection="column">
        <Text bold>Select a language:</Text>
        <Box marginTop={1}>
          <SelectInput items={langItems} onSelect={(item) => {
            if (item.value === '__back__') { setPhase('lang-gate'); return; }
            setCurrentLangKey(item.value);
            setCurrentManager('');
            setPhase('lang-manager');
          }} />
        </Box>
      </Box>
    );
  }

  // ── lang-manager ───────────────────────────────────────────────────────────
  if (phase === 'lang-manager') {
    const catalog = LANGUAGE_CATALOG[currentLangKey];
    const managerItems = (catalog?.managers ?? []).map(m => ({ label: m, value: m }));
    managerItems.push({ label: '← Back', value: '__back__' });
    return (
      <Box flexDirection="column">
        <Text bold>Version manager for <Text color="cyan">{catalog?.label ?? currentLangKey}</Text>:</Text>
        <Box marginTop={1}>
          <SelectInput items={managerItems} onSelect={(item) => {
            if (item.value === '__back__') { setPhase('lang-select'); return; }
            setCurrentManager(item.value);
            setPhase('lang-version');
          }} />
        </Box>
      </Box>
    );
  }

  // ── lang-version ───────────────────────────────────────────────────────────
  if (phase === 'lang-version') {
    const catalog = LANGUAGE_CATALOG[currentLangKey];
    const versionItems = (catalog?.versions ?? []).map(v => ({ label: v, value: v }));
    versionItems.push({ label: 'Other — enter manually', value: '__manual__' });
    versionItems.push({ label: '← Back', value: '__back__' });
    return (
      <Box flexDirection="column">
        <Text bold>Version for <Text color="cyan">{catalog?.label ?? currentLangKey}</Text> <Text dimColor>(via {currentManager})</Text>:</Text>
        <Box marginTop={1}>
          <SelectInput items={versionItems} onSelect={(item) => {
            if (item.value === '__back__') { setPhase('lang-manager'); return; }
            if (item.value === '__manual__') { setPhase('lang-version-manual'); return; }
            setForm(f => ({
              ...f,
              langBindings: [...f.langBindings, { runtime: currentLangKey, version: item.value, manager: currentManager }],
            }));
            setPhase('lang-another');
          }} />
        </Box>
      </Box>
    );
  }

  // ── lang-version-manual ────────────────────────────────────────────────────
  if (phase === 'lang-version-manual') {
    const catalog = LANGUAGE_CATALOG[currentLangKey];
    return (
      <Box flexDirection="column">
        <Text bold>Enter version for <Text color="cyan">{catalog?.label ?? currentLangKey}</Text>:</Text>
        <GateInput
          prompt="Version"
          hint={`e.g. ${catalog?.versions[0] ?? '1.0.0'}`}
          currentValue=""
          placeholder={catalog?.versions[0] ?? '1.0.0'}
          onConfirm={(v) => {
            const ver = v.trim();
            if (!ver) return;
            setForm(f => ({
              ...f,
              langBindings: [...f.langBindings, { runtime: currentLangKey, version: ver, manager: currentManager }],
            }));
            setPhase('lang-another');
          }}
          onBack={() => setPhase('lang-version')}
        />
      </Box>
    );
  }

  // ── lang-another ───────────────────────────────────────────────────────────
  if (phase === 'lang-another') {
    const hasMore = form.langBindings.length < LANGUAGE_KEYS.length;
    const anotherItems = [
      ...(hasMore ? [{ label: '+ Add another language', value: 'add' }] : []),
      { label: '→ Done with languages', value: 'done' },
      { label: '← Back to language list', value: 'back' },
    ];
    return (
      <Box flexDirection="column">
        <Text bold>Language bindings for <Text color="cyan">{form.label}</Text>:</Text>
        {form.langBindings.map(lb => (
          <Box key={lb.runtime} marginLeft={2}>
            <Text>• {LANGUAGE_CATALOG[lb.runtime]?.label ?? lb.runtime} <Text dimColor>{lb.version} via {lb.manager}</Text></Text>
          </Box>
        ))}
        <Box marginTop={1}>
          <SelectInput items={anotherItems} onSelect={(item) => {
            if (item.value === 'add') { setPhase('lang-select'); }
            else if (item.value === 'back') { setPhase('lang-select'); }
            else { completeContext(); }
          }} />
        </Box>
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


