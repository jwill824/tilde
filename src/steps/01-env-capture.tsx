import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { scanEnvironment } from '../capture/scanner.js';
import { createCaptureFilter, filterDotfiles } from '../capture/filter.js';
import type { EnvironmentCaptureReport } from '../capture/scanner.js';

interface Props {
  onComplete: (data: { captureReport: EnvironmentCaptureReport }) => void;
}

type Phase =
  | { type: 'prompt' }
  | { type: 'scanning' }
  | { type: 'summary'; report: EnvironmentCaptureReport; skippedCount: number; rcEntryCount: number }
  | { type: 'done' };

const promptItems = [
  { label: 'Yes (recommended)', value: 'yes' },
  { label: 'No (start fresh)', value: 'no' },
];

const confirmItems = [
  { label: 'Continue', value: 'continue' },
];

export function EnvCaptureStep({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>({ type: 'prompt' });

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
              if (item.value === 'yes') {
                setPhase({ type: 'scanning' });
              } else {
                onComplete({
                  captureReport: { dotfiles: [], brewPackages: [], rcFiles: {}, skippedFiles: [] },
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
          {skippedCount > 0 && (
            <Text color="yellow">⚠ Skipped {skippedCount} files (secrets excluded)</Text>
          )}
        </Box>
        <Box marginTop={1}>
          <SelectInput
            items={confirmItems}
            onSelect={() => onComplete({ captureReport: report })}
          />
        </Box>
      </Box>
    );
  }

  return null;
}
