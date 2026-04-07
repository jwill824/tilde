import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';

interface Props {
  onComplete: (data: { tools: string[]; configurations: { direnv: boolean } }) => void;
  defaultTools?: string;
  onBack?: () => void;
  isOptional?: boolean;
  initialValues?: Record<string, unknown>;
}

interface AppEntry {
  id: string;
  label: string;
  appPath: string;
  brewCask: string | null;
  installNote?: string;
  installed: boolean;
  selected: boolean;
}

const NOTE_TAKING_CATALOG: Omit<AppEntry, 'installed' | 'selected'>[] = [
  {
    id: 'obsidian',
    label: 'Obsidian',
    appPath: '/Applications/Obsidian.app',
    brewCask: 'obsidian',
  },
  {
    id: 'notion',
    label: 'Notion',
    appPath: '/Applications/Notion.app',
    brewCask: 'notion',
  },
  {
    id: 'bear',
    label: 'Bear',
    appPath: '/Applications/Bear.app',
    brewCask: null,
    installNote: 'App Store only',
  },
];

type Phase = 'detecting' | 'select-apps' | 'manual-tools-gate' | 'manual-tools';

export function ToolsStep({ onComplete, defaultTools = '', onBack, isOptional: _isOptional, initialValues = {} }: Props) {
  const [phase, setPhase] = useState<Phase>('detecting');
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [cursor, setCursor] = useState(0);
  const [toolInput, setToolInput] = useState(() => {
    const saved = initialValues.tools as string[] | undefined;
    if (saved) return saved.filter(t => t !== 'direnv' && !NOTE_TAKING_CATALOG.some(a => a.brewCask === t)).join(', ');
    return defaultTools;
  });
  const direnv = true;

  useEffect(() => {
    const savedTools = initialValues.tools as string[] | undefined;
    async function detectApps() {
      const { access } = await import('node:fs/promises');
      const entries: AppEntry[] = await Promise.all(
        NOTE_TAKING_CATALOG.map(async (app) => {
          let installed = false;
          try {
            await access(app.appPath);
            installed = true;
          } catch { /* not installed */ }
          const selected = savedTools
            ? (app.brewCask ? savedTools.includes(app.brewCask) : installed)
            : installed;
          return { ...app, installed, selected };
        })
      );
      setApps(entries);
      setPhase('select-apps');
    }
    detectApps().catch(() => {
      setApps(NOTE_TAKING_CATALOG.map(app => ({ ...app, installed: false, selected: false })));
      setPhase('select-apps');
    });
  }, []);

  useInput((input, key) => {
    if (phase === 'select-apps') {
      if (key.upArrow) setCursor(c => Math.max(0, c - 1));
      if (key.downArrow) setCursor(c => Math.min(apps.length - 1, c + 1));
      if (input === ' ') {
        const app = apps[cursor];
        if (app.brewCask) {
          setApps(prev => prev.map((a, i) => i === cursor ? { ...a, selected: !a.selected } : a));
        }
      }
      if (key.return) handleConfirmApps();
      if (input === 'b' && onBack) { onBack(); return; }
    }
    // In manual-tools phase a TextInput is active — back is handled via the pre-gate
  });

  function handleConfirmApps() {
    setPhase('manual-tools-gate');
  }

  function handleCompleteTools(v: string) {
    const manualTools = v
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    const noteTools = apps
      .filter(a => a.selected && a.brewCask)
      .map(a => a.brewCask!);
    const tools = [...noteTools, ...manualTools];
    if (direnv && !tools.includes('direnv')) {
      tools.unshift('direnv');
    }
    onComplete({ tools, configurations: { direnv } });
  }

  if (phase === 'detecting') {
    return (
      <Box>
        <Text color="green"><Spinner type="dots" /></Text>
        <Text> Detecting installed note-taking apps…</Text>
      </Box>
    );
  }

  if (phase === 'select-apps') {
    return (
      <Box flexDirection="column">
        <Text bold>Note-taking apps:</Text>
        <Text dimColor>Space to toggle, Enter to confirm. Already-installed apps are pre-selected.</Text>
        <Box flexDirection="column" marginTop={1}>
          {apps.map((app, idx) => (
            <Box key={app.id}>
              <Text color={idx === cursor ? 'cyan' : undefined}>
                {idx === cursor ? '❯ ' : '  '}
                {app.selected ? '[x] ' : '[ ] '}
                <Text bold={app.installed}>{app.label}</Text>
                {app.installed && <Text color="green"> ✓</Text>}
                {app.installNote && <Text dimColor> ({app.installNote})</Text>}
                {!app.brewCask && !app.installed && <Text dimColor> (not available via Homebrew)</Text>}
              </Text>
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Use ↑↓ + Space to toggle, Enter to confirm{onBack ? ', b to go back' : ''}</Text>
        </Box>
      </Box>
    );
  }

  // phase === 'manual-tools-gate' — SelectInput gate before TextInput so back nav works
  if (phase === 'manual-tools-gate') {
    const gateItems = [
      { label: 'Enter additional tools →', value: 'edit' },
      { label: '← Back to app selection', value: 'back' },
    ];
    return (
      <Box flexDirection="column">
        <Text bold>Additional tools to install:</Text>
        <Text dimColor>Comma-separated Homebrew formula/cask names (leave blank for none)</Text>
        <Box marginTop={1}>
          <SelectInput
            items={gateItems}
            onSelect={(item) => {
              if (item.value === 'back') { setPhase('select-apps'); return; }
              setPhase('manual-tools');
            }}
          />
        </Box>
      </Box>
    );
  }

  // phase === 'manual-tools'
  return (
    <Box flexDirection="column">
      <Text bold>Additional tools to install:</Text>
      <Text dimColor>Comma-separated Homebrew formula/cask names (leave blank for none)</Text>
      <Text dimColor>direnv is pre-selected ✓</Text>
      {apps.filter(a => a.selected && a.brewCask).length > 0 && (
        <Text dimColor>Note-taking: {apps.filter(a => a.selected && a.brewCask).map(a => a.label).join(', ')} ✓</Text>
      )}
      <Box marginTop={1}>
        <TextInput
          value={toolInput}
          onChange={setToolInput}
          onSubmit={handleCompleteTools}
          placeholder="git-delta, ripgrep, fzf"
        />
      </Box>
    </Box>
  );
}
