import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import type { VersionManagerChoice, LanguageChoice } from '../config/schema.js';

const MANAGER_LANGUAGES: Record<string, string[]> = {
  vfox: ['node', 'python', 'java', 'go', 'rust'],
  nvm: ['node'],
  pyenv: ['python'],
  sdkman: ['java', 'kotlin', 'scala'],
};

interface Props {
  versionManagers: VersionManagerChoice[];
  onComplete: (data: { languages: LanguageChoice[] }) => void;
}

interface LanguageEntry {
  name: string;
  manager: string;
  version: string;
}

/** Auto-advances by calling onComplete on mount. */
function AutoAdvanceEmpty({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    onComplete();
  }, []);
  return <Box><Text dimColor>No version managers selected, skipping languages.</Text></Box>;
}

export function LanguagesStep({ versionManagers, onComplete }: Props) {
  const allLanguages: LanguageEntry[] = versionManagers.flatMap(vm =>
    (MANAGER_LANGUAGES[vm.name] ?? []).map(lang => ({
      name: lang,
      manager: vm.name,
      version: '',
    }))
  );

  // Deduplicate by name (prefer first manager)
  const unique = Array.from(
    new Map(allLanguages.map(l => [l.name, l])).values()
  );

  const [entries, setEntries] = useState<LanguageEntry[]>(unique);
  const [currentIdx, setCurrentIdx] = useState(0);

  if (versionManagers.length === 0) {
    return <AutoAdvanceEmpty onComplete={() => onComplete({ languages: [] })} />;
  }

  if (currentIdx >= entries.length) {
    return (
      <Box flexDirection="column">
        <Text bold>Language versions configured:</Text>
        {entries.filter(e => e.version).map(e => (
          <Box key={e.name} marginLeft={2}>
            <Text>• {e.name}@{e.version} (via {e.manager})</Text>
          </Box>
        ))}
      </Box>
    );
  }

  const current = entries[currentIdx];

  const handleSubmit = (version: string) => {
    const updated = entries.map((e, i) =>
      i === currentIdx ? { ...e, version } : e
    );
    setEntries(updated);
    if (currentIdx + 1 >= entries.length) {
      onComplete({
        languages: updated
          .filter(e => e.version.trim())
          .map(e => ({ name: e.name, version: e.version.trim(), manager: e.manager })),
      });
    } else {
      setCurrentIdx(idx => idx + 1);
    }
  };

  return (
    <Box flexDirection="column">
      <Text bold>Language versions ({currentIdx + 1}/{entries.length})</Text>
      <Text>
        {current.name} version{' '}
        <Text dimColor>(via {current.manager}, leave blank to skip)</Text>
      </Text>
      <Box marginTop={1}>
        <TextInput
          value={current.version}
          onChange={(v) => {
            setEntries(prev => prev.map((e, i) => i === currentIdx ? { ...e, version: v } : e));
          }}
          onSubmit={handleSubmit}
          placeholder="e.g. 20.0.0"
        />
      </Box>
    </Box>
  );
}
