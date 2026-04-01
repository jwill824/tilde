/**
 * Step 15: AI Coding Tools
 *
 * Shows a curated list of AI coding assistant tools with Homebrew install status.
 * Users can select tools to install. Tools with variants appear as separate labeled rows.
 *
 * This step is optional (required: false) — users can skip it.
 */
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import type { AIToolConfig } from '../config/schema.js';

interface Props {
  onComplete: (data: { aiTools: AIToolConfig[] }) => void;
  onBack?: () => void;
  isOptional?: boolean;
  onSkip?: () => void;
}

interface AIToolEntry {
  name: string;
  label: string;
  variant: string;
  brewId: string;
  brewType: 'formula' | 'cask';
  installed: boolean;
  selected: boolean;
}

// Curated list per research.md §5
const CURATED_AI_TOOLS: Omit<AIToolEntry, 'installed' | 'selected'>[] = [
  { name: 'claude-code',   label: 'Claude Code',          variant: 'cli-tool',          brewId: 'anthropics/tap/claude',  brewType: 'formula' },
  { name: 'claude',        label: 'Claude Desktop',       variant: 'desktop-app',       brewId: 'claude',                 brewType: 'cask' },
  { name: 'cursor',        label: 'Cursor',               variant: 'ai-editor',         brewId: 'cursor',                 brewType: 'cask' },
  { name: 'windsurf',      label: 'Windsurf (Codeium)',   variant: 'ai-editor',         brewId: 'windsurf',               brewType: 'cask' },
  { name: 'gh',            label: 'GitHub Copilot CLI',   variant: 'cli-extension',     brewId: 'gh',                     brewType: 'formula' },
];

type Phase = 'loading' | 'select' | 'installing' | 'done' | 'error';

export function AIToolsStep({ onComplete, onBack, isOptional, onSkip }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [tools, setTools] = useState<AIToolEntry[]>([]);
  const [cursor, setCursor] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [skippedInstalls, setSkippedInstalls] = useState<string[]>([]);

  useEffect(() => {
    async function loadTools() {
      try {
        const { listInstalledFormulae, listInstalledCasks } = await import('../utils/package-manager.js');
        const [formulae, casks] = await Promise.allSettled([
          listInstalledFormulae(),
          listInstalledCasks(),
        ]);
        const installedFormulae = formulae.status === 'fulfilled' ? formulae.value : [];
        const installedCasks = casks.status === 'fulfilled' ? casks.value : [];

        const entries: AIToolEntry[] = CURATED_AI_TOOLS.map(t => ({
          ...t,
          installed: t.brewType === 'formula'
            ? installedFormulae.some(f => f === t.brewId || f.includes(t.brewId))
            : installedCasks.some(c => c === t.brewId),
          selected: false,
        }));
        setTools(entries);
        setPhase('select');
      } catch (err) {
        setErrorMsg((err as Error).message);
        // Fallback: show tools as not installed
        setTools(CURATED_AI_TOOLS.map(t => ({ ...t, installed: false, selected: false })));
        setPhase('select');
      }
    }
    loadTools().catch(() => {});
  }, []);

  useInput((input, key) => {
    if (phase === 'select') {
      if (key.upArrow) setCursor(c => Math.max(0, c - 1));
      if (key.downArrow) setCursor(c => Math.min(tools.length - 1, c + 1));
      if (input === ' ') {
        setTools(prev => prev.map((t, i) => i === cursor ? { ...t, selected: !t.selected } : t));
      }
      if (input === 'b' && onBack) { onBack(); return; }
      if (input === 's' && isOptional && onSkip) { onSkip(); return; }
    }
  });

  async function handleInstall() {
    const toInstall = tools.filter(t => t.selected && !t.installed);
    if (toInstall.length === 0) {
      finishWithSelected();
      return;
    }

    setPhase('installing');
    const skipped: string[] = [];
    const { installFormula, installCask } = await import('../utils/package-manager.js');

    for (const tool of toInstall) {
      try {
        if (tool.brewType === 'formula') {
          await installFormula(tool.brewId);
        } else {
          await installCask(tool.brewId);
        }
      } catch {
        skipped.push(tool.label);
      }
    }

    setSkippedInstalls(skipped);
    finishWithSelected();
  }

  function finishWithSelected() {
    const selectedTools: AIToolConfig[] = tools
      .filter(t => t.selected || t.installed)
      .map(t => ({
        name: t.name,
        label: t.label,
        variant: t.variant,
      }));
    onComplete({ aiTools: selectedTools });
  }

  if (phase === 'loading') {
    return (
      <Box>
        <Text color="green"><Spinner type="dots" /></Text>
        <Text> Checking installed AI tools…</Text>
      </Box>
    );
  }

  if (phase === 'installing') {
    return (
      <Box>
        <Text color="green"><Spinner type="dots" /></Text>
        <Text> Installing selected AI tools via Homebrew…</Text>
      </Box>
    );
  }

  if (phase === 'error') {
    return (
      <Box flexDirection="column">
        <Text color="red">Error loading AI tools: {errorMsg}</Text>
      </Box>
    );
  }

  // select phase
  return (
    <Box flexDirection="column">
      <Text bold>AI Coding Tools</Text>
      <Text dimColor>Space to select tools to install. Already-installed tools are pre-checked.</Text>
      {errorMsg && <Text color="yellow">⚠ Could not check install status (offline?): using defaults</Text>}
      <Box flexDirection="column" marginTop={1}>
        {tools.map((t, idx) => (
          <Box key={t.name}>
            <Text color={idx === cursor ? 'cyan' : undefined}>
              {idx === cursor ? '❯ ' : '  '}
              {t.selected ? '[x] ' : '[ ] '}
              <Text bold>{t.label}</Text>
              <Text dimColor> ({t.variant})</Text>
              {t.installed ? <Text color="green"> ✓</Text> : null}
            </Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <SelectInput
          items={[
            { label: 'Confirm and install selected', value: 'confirm' },
            ...(onBack ? [{ label: '← Back', value: 'back' }] : []),
            ...(isOptional && onSkip ? [{ label: '→ Skip (install nothing)', value: 'skip' }] : []),
          ]}
          onSelect={(item) => {
            if (item.value === 'confirm') { handleInstall().catch(() => {}); }
            if (item.value === 'back' && onBack) { onBack(); }
            if (item.value === 'skip' && onSkip) { onSkip(); }
          }}
        />
      </Box>
      {skippedInstalls.length > 0 && (
        <Box marginTop={1}>
          <Text color="yellow">⚠ Could not install: {skippedInstalls.join(', ')} (check network)</Text>
        </Box>
      )}
    </Box>
  );
}
