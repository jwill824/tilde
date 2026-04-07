import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import type { ConfigurationDomains, EditorsConfig } from '../config/schema.js';

interface Props {
  onComplete: (data: { configurations: ConfigurationDomains; editors?: EditorsConfig }) => void;
  onBack?: () => void;
  isOptional?: boolean;
  onSkip?: () => void;
  initialValues?: Record<string, unknown>;
}

const DOMAINS: { key: keyof ConfigurationDomains; label: string }[] = [
  { key: 'git', label: 'git — Manage .gitconfig and context overrides' },
  { key: 'vscode', label: 'vscode — Manage VS Code settings/profiles' },
  { key: 'aliases', label: 'aliases — Manage shell aliases file' },
  { key: 'osDefaults', label: 'osDefaults — Apply macOS defaults write commands' },
  { key: 'direnv', label: 'direnv — Install direnv + generate .envrc files' },
];

const EDITOR_OPTIONS = [
  { label: 'VS Code', value: 'vscode' },
  { label: 'Cursor', value: 'cursor' },
  { label: 'Neovim', value: 'neovim' },
  { label: 'JetBrains (WebStorm / IntelliJ)', value: 'webstorm' },
  { label: 'Zed', value: 'zed' },
  { label: 'None / Skip editor selection', value: 'none' },
];

type Phase = 'domains' | 'editor-primary' | 'editor-additional';

export function AppConfigStep({ onComplete, onBack, isOptional, onSkip }: Props) {
  const [phase, setPhase] = useState<Phase>('editor-primary');
  const [cursor, setCursor] = useState(0);
  const [enabled, setEnabled] = useState<ConfigurationDomains>({
    git: true,
    vscode: false,
    aliases: false,
    osDefaults: false,
    direnv: true,
  });
  const [primaryEditor, setPrimaryEditor] = useState<string | undefined>();
  const [additionalEditors] = useState<string[]>([]);

  useInput((input, key) => {
    if (phase === 'domains') {
      if (key.upArrow) setCursor(c => Math.max(0, c - 1));
      if (key.downArrow) setCursor(c => Math.min(DOMAINS.length - 1, c + 1));
      if (input === ' ') {
        const domain = DOMAINS[cursor].key;
        setEnabled(prev => ({ ...prev, [domain]: !prev[domain] }));
      }
      if (key.return) {
        const editors: EditorsConfig | undefined = primaryEditor && primaryEditor !== 'none'
          ? { primary: primaryEditor, additional: additionalEditors }
          : undefined;
        onComplete({ configurations: enabled, editors });
      }
    }
    if (input === 'b' && onBack) onBack();
    if (input === 's' && isOptional && onSkip) onSkip();
  });

  // Phase 1: Primary editor selection
  if (phase === 'editor-primary') {
    return (
      <Box flexDirection="column">
        <Text bold>Editor Configuration — Primary Editor</Text>
        <Text dimColor>Which editor do you primarily use? (optional step)</Text>
        <Box marginTop={1}>
          <SelectInput
            items={EDITOR_OPTIONS}
            onSelect={(item) => {
              setPrimaryEditor(item.value);
              if (item.value === 'none') {
                onComplete({ configurations: enabled, editors: undefined });
              } else {
                setPhase('domains');
              }
            }}
          />
        </Box>
        {(onBack || (isOptional && onSkip)) && (
          <Box marginTop={1} gap={2}>
            {onBack && <Text dimColor>← Back (b)</Text>}
            {isOptional && onSkip && <Text dimColor>→ Skip (s)</Text>}
          </Box>
        )}
      </Box>
    );
  }

  // Phase 2: Domain toggles
  return (
    <Box flexDirection="column">
      <Text bold>Which configuration domains should tilde manage?</Text>
      <Text dimColor>Space to toggle, Enter to confirm</Text>
      <Box flexDirection="column" marginTop={1}>
        {DOMAINS.map((d, idx) => (
          <Box key={d.key}>
            <Text color={idx === cursor ? 'cyan' : undefined}>
              {idx === cursor ? '❯ ' : '  '}
              {enabled[d.key] ? '[x] ' : '[ ] '}
              {d.label}
            </Text>
          </Box>
        ))}
      </Box>
      {(onBack || (isOptional && onSkip)) && (
        <Box marginTop={1} gap={2}>
          {onBack && <Text dimColor>← Back (b)</Text>}
          {isOptional && onSkip && <Text dimColor>→ Skip (s)</Text>}
        </Box>
      )}
    </Box>
  );
}
