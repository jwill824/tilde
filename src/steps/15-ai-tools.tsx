/**
 * Step 15: AI Coding Tools
 *
 * Renders AI coding assistant tools sourced from the AI_TOOL_PLUGINS registry
 * (Principle VIII compliance — no inline literals). Users can select tools to
 * install. Tools with variants appear as separate labeled rows.
 *
 * This step is optional (required: false) — users can skip it.
 */
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import type { AIToolConfig } from '../config/schema.js';
import type { AIToolPlugin } from '../plugins/api.js';
import { AI_TOOL_PLUGINS } from '../plugins/first-party/ai-tools/index.js';

interface Props {
  onComplete: (data: { aiTools: AIToolConfig[] }) => void;
  onBack?: () => void;
  isOptional?: boolean;
  onSkip?: () => void;
  initialValues?: Record<string, unknown>;
}

interface AIToolEntry {
  plugin: AIToolPlugin;
  installed: boolean;
  selected: boolean;
}

type Phase = 'loading' | 'select' | 'installing' | 'done' | 'error';

export function AIToolsStep({ onComplete, onBack, isOptional, onSkip, initialValues = {} }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [tools, setTools] = useState<AIToolEntry[]>([]);
  const [cursorIdx, setCursorIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [skippedInstalls, setSkippedInstalls] = useState<string[]>([]);

  useEffect(() => {
    const savedNames = (initialValues.aiTools as Array<{ name: string }> | undefined)?.map(t => t.name);
    async function loadTools() {
      try {
        const entries: AIToolEntry[] = await Promise.all(
          AI_TOOL_PLUGINS.map(async (plugin) => ({
            plugin,
            installed: await plugin.detectInstalled().catch(() => false),
            selected: savedNames ? savedNames.includes(plugin.name) : false,
          }))
        );
        setTools(entries);
        setPhase('select');
      } catch (err) {
        setErrorMsg((err as Error).message);
        setTools(AI_TOOL_PLUGINS.map(plugin => ({
          plugin,
          installed: false,
          selected: savedNames ? savedNames.includes(plugin.name) : false,
        })));
        setPhase('select');
      }
    }
    loadTools().catch(() => {});
  }, []);

  useInput((input, key) => {
    if (phase === 'select') {
      if (key.upArrow) setCursorIdx(c => Math.max(0, c - 1));
      if (key.downArrow) setCursorIdx(c => Math.min(tools.length - 1, c + 1));
      if (input === ' ') {
        setTools(prev => prev.map((t, i) => i === cursorIdx ? { ...t, selected: !t.selected } : t));
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

    for (const entry of toInstall) {
      try {
        await entry.plugin.install();
      } catch {
        skipped.push(entry.plugin.label);
      }
    }

    setSkippedInstalls(skipped);
    finishWithSelected();
  }

  function finishWithSelected() {
    const selectedTools: AIToolConfig[] = tools
      .filter(t => t.selected || t.installed)
      .map(t => ({
        name: t.plugin.name,
        label: t.plugin.label,
        variant: t.plugin.variant,
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

  return (
    <Box flexDirection="column">
      <Text bold>AI Coding Tools</Text>
      <Text dimColor>Space to select tools to install. Already-installed tools are pre-checked.</Text>
      {errorMsg && <Text color="yellow">⚠ Could not check install status (offline?): using defaults</Text>}
      <Box flexDirection="column" marginTop={1}>
        {tools.map((t, idx) => (
          <Box key={t.plugin.name}>
            <Text color={idx === cursorIdx ? 'cyan' : undefined}>
              {idx === cursorIdx ? '❯ ' : '  '}
              {t.selected ? '[x] ' : '[ ] '}
              <Text bold>{t.plugin.label}</Text>
              <Text dimColor> ({t.plugin.variant})</Text>
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
