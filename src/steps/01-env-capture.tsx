import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { scanEnvironment } from '../capture/scanner.js';
import { createCaptureFilter, filterDotfiles } from '../capture/filter.js';
import type { EnvironmentCaptureReport } from '../capture/scanner.js';

interface Props {
  onComplete: (data: { captureReport: EnvironmentCaptureReport }) => void;
  onBack?: () => void;
  isOptional?: boolean;
}

type Phase =
  | { type: 'prompt' }
  | { type: 'scanning' }
  | { type: 'summary'; report: EnvironmentCaptureReport; skippedCount: number; rcEntryCount: number }
  | { type: 'done' };

export function EnvCaptureStep({ onComplete, onBack, isOptional: _isOptional }: Props) {
  const [phase, setPhase] = useState<Phase>({ type: 'prompt' });

  const promptItems = [
    { label: 'Yes (recommended)', value: 'yes' },
    { label: 'No (start fresh)', value: 'no' },
    ...(onBack ? [{ label: '← Back', value: 'back' }] : []),
  ];

  const confirmItems = [
    { label: 'Continue', value: 'continue' },
    ...(onBack ? [{ label: '← Back', value: 'back' }] : []),
  ];

  useEffect(() => {
    if (phase.type !== 'scanning') return;

    async function doScan() {
      const report = await scanEnvironment();
      const filter = createCaptureFilter();
      const { included, excluded } = filterDotfiles(report.dotfiles, filter);
      const rcEntryCount =
        Object.values(report.rcFiles).reduce((acc, content) => acc + content.split('\n').filter(Boolean).length, 0);

      const finalReport: EnvironmentCaptureReport = {
        ...report,
        dotfiles: included,
        skippedFiles: excluded,
      };

      setPhase({ type: 'summary', report: finalReport, skippedCount: excluded.length, rcEntryCount });
    }

    doScan().catch(() => {
      // On scan failure, return empty report
      onComplete({
        captureReport: { dotfiles: [], brewPackages: [], rcFiles: {}, skippedFiles: [] },
      });
    });
  }, [phase.type]);

  if (phase.type === 'prompt') {
    return (
      <Box flexDirection="column">
        <Text bold>Scan this machine for existing environment?</Text>
        <Text dimColor>(recommended — detects shell, Homebrew packages, dotfiles)</Text>
        <Box marginTop={1}>
          <SelectInput
            items={promptItems}
            onSelect={(item) => {
              if (item.value === 'back' && onBack) { onBack(); return; }
              if (item.value === 'yes') {
                setPhase({ type: 'scanning' });
              } else {
                onComplete({
                  captureReport: { dotfiles: [], brewPackages: [], rcFiles: {}, skippedFiles: [], detectedLanguages: [], detectedVersionManagers: [] },
                });
              }
            }}
          />
        </Box>
      </Box>
    );
  }

  if (phase.type === 'scanning') {
    return (
      <Box>
        <Text color="green">
          <Spinner type="dots" />
        </Text>
        <Text> Scanning environment...</Text>
      </Box>
    );
  }

  if (phase.type === 'summary') {
    const { report, skippedCount, rcEntryCount } = phase;
    return (
      <Box flexDirection="column">
        <Text bold>Environment scan complete:</Text>
        <Box marginTop={1} flexDirection="column">
          <Text color="green">✓ Found {report.brewPackages.length} packages (brew)</Text>
          <Text color="green">✓ Found {report.dotfiles.length} dotfiles</Text>
          <Text color="green">✓ Found {rcEntryCount} rc entries</Text>
          {report.detectedLanguages.length > 0 && (
            <Text color="green">✓ Languages: {report.detectedLanguages.map(l => `${l.name} ${l.version}`).join(', ')}</Text>
          )}
          {report.detectedVersionManagers.length > 0 && (
            <Text color="green">✓ Version managers: {report.detectedVersionManagers.map(v => v.name).join(', ')}</Text>
          )}
          {skippedCount > 0 && (
            <Text color="yellow">⚠ Skipped {skippedCount} files (secrets excluded)</Text>
          )}
        </Box>
        <Box marginTop={1}>
          <SelectInput
            items={confirmItems}
            onSelect={(item) => {
              if (item.value === 'back' && onBack) { onBack(); return; }
              onComplete({ captureReport: report });
            }}
          />
        </Box>
      </Box>
    );
  }

  return null;
}
