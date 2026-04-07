/**
 * Step 14: Browser Selection
 *
 * Detects installed browsers by checking known .app bundle paths,
 * allows user to select additional ones for Homebrew installation,
 * and optionally sets a system default browser via `defaultbrowser` CLI.
 *
 * This step is optional (required: false) — users can skip it.
 */
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import type { BrowserConfig } from '../config/schema.js';

interface Props {
  onComplete: (data: { browser: BrowserConfig }) => void;
  onBack?: () => void;
  isOptional?: boolean;
  onSkip?: () => void;
  initialValues?: Record<string, unknown>;
}

interface BrowserEntry {
  id: string;
  label: string;
  appPath: string;
  brewCask?: string;
  defaultBrowserId: string;
  installed: boolean;
  selected: boolean;
}

const KNOWN_BROWSERS: Omit<BrowserEntry, 'installed' | 'selected'>[] = [
  { id: 'safari',  label: 'Safari',          appPath: '/Applications/Safari.app',          defaultBrowserId: 'safari' },
  { id: 'chrome',  label: 'Google Chrome',   appPath: '/Applications/Google Chrome.app',   brewCask: 'google-chrome', defaultBrowserId: 'chrome' },
  { id: 'firefox', label: 'Firefox',         appPath: '/Applications/Firefox.app',         brewCask: 'firefox',        defaultBrowserId: 'firefox' },
  { id: 'arc',     label: 'Arc',             appPath: '/Applications/Arc.app',             brewCask: 'arc',            defaultBrowserId: 'arc' },
  { id: 'brave',   label: 'Brave Browser',   appPath: '/Applications/Brave Browser.app',   brewCask: 'brave-browser',  defaultBrowserId: 'brave' },
  { id: 'edge',    label: 'Microsoft Edge',  appPath: '/Applications/Microsoft Edge.app',  brewCask: 'microsoft-edge', defaultBrowserId: 'edge' },
];

type Phase = 'detecting' | 'select-browsers' | 'set-default' | 'installing' | 'done' | 'error';

export function BrowserStep({ onComplete, onBack, isOptional, onSkip, initialValues = {} }: Props) {
  const [phase, setPhase] = useState<Phase>('detecting');
  const [browsers, setBrowsers] = useState<BrowserEntry[]>([]);
  const [cursor, setCursor] = useState(0);
  const [, setDefaultBrowser] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [skippedInstalls, setSkippedInstalls] = useState<string[]>([]);

  useEffect(() => {
    const savedIds = (initialValues.browser as { selected?: string[] } | undefined)?.selected;
    async function detectBrowsers() {
      const { access } = await import('node:fs/promises');
      const entries: BrowserEntry[] = await Promise.all(
        KNOWN_BROWSERS.map(async (b) => {
          let installed = false;
          try {
            await access(b.appPath);
            installed = true;
          } catch {
            // installed remains false
          }
          const selected = savedIds ? savedIds.includes(b.id) : installed;
          return { ...b, installed, selected };
        })
      );
      setBrowsers(entries);
      setPhase('select-browsers');
    }
    detectBrowsers().catch((err) => {
      setErrorMsg((err as Error).message);
      setPhase('error');
    });
  }, []);

  useInput((input, key) => {
    if (phase === 'select-browsers') {
      if (key.upArrow) setCursor(c => Math.max(0, c - 1));
      if (key.downArrow) setCursor(c => Math.min(browsers.length - 1, c + 1));
      if (input === ' ') {
        setBrowsers(prev => prev.map((b, i) => i === cursor ? { ...b, selected: !b.selected } : b));
      }
      if (key.return) { handleConfirmBrowsers().catch(() => {}); return; }
      if (input === 'b' && onBack) { onBack(); return; }
      if (input === 's' && isOptional && onSkip) { onSkip(); return; }
    }
  });

  async function handleConfirmBrowsers() {
    const selected = browsers.filter(b => b.selected);
    const toInstall = selected.filter(b => !b.installed && b.brewCask);

    if (toInstall.length > 0) {
      setPhase('installing');
      const skipped: string[] = [];
      for (const b of toInstall) {
        try {
          const { installCask } = await import('../utils/package-manager.js');
          await installCask(b.brewCask!);
        } catch {
          skipped.push(b.label);
        }
      }
      setSkippedInstalls(skipped);
    }

    setPhase('set-default');
  }

  async function handleSetDefault(browserId: string | null) {
    if (browserId) {
      try {
        const { execa } = await import('execa');
        await execa('defaultbrowser', [browserId]);
        setDefaultBrowser(browserId);
      } catch {
        // defaultbrowser may not be installed or user cancelled macOS dialog
        setDefaultBrowser(browserId); // still record the preference
      }
    }

    const selectedIds = browsers.filter(b => b.selected).map(b => b.id);
    onComplete({
      browser: {
        selected: selectedIds,
        default: browserId,
      },
    });
  }

  if (phase === 'detecting') {
    return (
      <Box flexDirection="column">
        <Box>
          <Text color="green"><Spinner type="dots" /></Text>
          <Text> Detecting installed browsers…</Text>
        </Box>
      </Box>
    );
  }

  if (phase === 'error') {
    return (
      <Box flexDirection="column">
        <Text color="red">Error detecting browsers: {errorMsg}</Text>
        {(onBack || (isOptional && onSkip)) && (
          <Box marginTop={1} gap={2}>
            {onBack && <Text dimColor>← Back (b)</Text>}
            {isOptional && onSkip && <Text dimColor>→ Skip (s)</Text>}
          </Box>
        )}
      </Box>
    );
  }

  if (phase === 'installing') {
    return (
      <Box flexDirection="column">
        <Box>
          <Text color="green"><Spinner type="dots" /></Text>
          <Text> Installing selected browsers via Homebrew…</Text>
        </Box>
      </Box>
    );
  }

  if (phase === 'set-default') {
    const selectedBrowsers = browsers.filter(b => b.selected);
    const defaultItems = [
      ...selectedBrowsers.map(b => ({ label: `Set ${b.label} as default`, value: b.defaultBrowserId })),
      { label: 'No default change', value: 'none' },
    ];

    return (
      <Box flexDirection="column">
        <Text bold>Set Default Browser</Text>
        <Text dimColor>This will open a macOS confirmation dialog</Text>
        {skippedInstalls.length > 0 && (
          <Box marginTop={1}>
            <Text color="yellow">⚠ Some browsers could not be installed (offline?): {skippedInstalls.join(', ')}</Text>
          </Box>
        )}
        <Box marginTop={1}>
          <SelectInput
            items={defaultItems}
            onSelect={(item) => {
              handleSetDefault(item.value === 'none' ? null : item.value).catch(() => {});
            }}
          />
        </Box>
      </Box>
    );
  }

  // select-browsers phase
  return (
    <Box flexDirection="column">
      <Text bold>Browser Selection</Text>
      <Text dimColor>Space to toggle, Enter to confirm. Uninstalled browsers will be installed via Homebrew.</Text>
      <Box flexDirection="column" marginTop={1}>
        {browsers.map((b, idx) => (
          <Box key={b.id}>
            <Text color={idx === cursor ? 'cyan' : undefined}>
              {idx === cursor ? '❯ ' : '  '}
              {b.selected ? '[x] ' : '[ ] '}
              {b.label}
              {!b.installed ? <Text dimColor> (not installed)</Text> : null}
            </Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1} gap={2}>
        <Text dimColor>↑↓ + Space to toggle, Enter to confirm</Text>
        {onBack && <Text dimColor>← Back (b)</Text>}
        {isOptional && onSkip && <Text dimColor>→ Skip (s)</Text>}
      </Box>
    </Box>
  );
}
