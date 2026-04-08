import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface Props {
  onComplete: (data: { packageManagers: string[] }) => void;
  onBack?: () => void;
  isOptional?: boolean;
  initialValues?: Record<string, unknown>;
}

const OPTIONS = [
  { value: 'homebrew', label: 'Homebrew', description: '(brew) — most popular on macOS' },
  { value: 'macports', label: 'MacPorts', description: '(port) — ports-based alternative' },
  { value: 'nix',      label: 'Nix',      description: '(nix)  — reproducible environments' },
] as const;

type PMValue = typeof OPTIONS[number]['value'];

export function PackageManagerStep({ onComplete, onBack, isOptional: _isOptional, initialValues = {} }: Props) {
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<PMValue>>(() => {
    const saved = initialValues.packageManagers as PMValue[] | undefined;
    return saved?.length ? new Set(saved) : new Set(['homebrew']);
  });

  useInput((input, key) => {
    if (key.upArrow) setCursor(c => Math.max(0, c - 1));
    if (key.downArrow) setCursor(c => Math.min(OPTIONS.length - 1, c + 1));
    if (input === ' ') {
      const opt = OPTIONS[cursor].value;
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(opt)) next.delete(opt);
        else next.add(opt);
        return next;
      });
    }
    if (input === 'b' && onBack) { onBack(); return; }
    if (key.return) {
      const chosen = Array.from(selected);
      onComplete({ packageManagers: chosen.length > 0 ? chosen : ['homebrew'] });
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold>Which package managers do you want?</Text>
      <Text dimColor>Space to toggle, Enter to confirm</Text>
      <Box flexDirection="column" marginTop={1}>
        {OPTIONS.map((opt, idx) => (
          <Box key={opt.value}>
            <Text color={idx === cursor ? 'cyan' : undefined}>
              {idx === cursor ? '❯ ' : '  '}
              {selected.has(opt.value) ? '[x] ' : '[ ] '}
              <Text bold={selected.has(opt.value)}>{opt.label}</Text>
              <Text dimColor> {opt.description}</Text>
            </Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          Selected: {selected.size === 0 ? 'none' : Array.from(selected).join(', ')}
        </Text>
      </Box>
      {onBack && <Box marginTop={1}><Text dimColor>← Back (b)</Text></Box>}
    </Box>
  );
}

