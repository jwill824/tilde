/**
 * `tilde update <resource>` interactive mini-wizard mode (T015 / T016 / T017).
 *
 * Accepts a resource name, validates it against UpdateResource enum, loads the
 * full config, mounts only the matching step component as a standalone mini-wizard,
 * then writes only the updated section back via atomicWriteConfig.
 *
 * Exit codes per contracts/cli-schema.md §1:
 *   0 — update completed successfully
 *   1 — invalid resource name
 *   2 — no config discoverable
 *   3 — config found but invalid / unreadable
 */
import React, { useEffect, useState } from 'react';
import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';
import { loadConfig } from '../config/reader.js';
import { atomicWriteConfig } from '../config/writer.js';
import { ShellStep } from '../steps/shell.js';
import { AppConfigStep } from '../steps/app-config.js';
import { ToolsStep } from '../steps/tools.js';
import { BrowserStep } from '../steps/browser.js';
import { AIToolsStep } from '../steps/ai-tools.js';
import { ContextsStep } from '../steps/contexts.js';
import { LanguagesStep } from '../steps/languages.js';
import type { TildeConfig } from '../config/schema.js';
import { CURRENT_SCHEMA_VERSION } from '../config/migrations/runner.js';

// ---------------------------------------------------------------------------
// Valid resource names (per contracts/cli-schema.md §1)
// ---------------------------------------------------------------------------

export const VALID_UPDATE_RESOURCES = [
  'shell',
  'editor',
  'applications',
  'browser',
  'ai-tools',
  'contexts',
  'languages',
] as const;

export type UpdateResource = typeof VALID_UPDATE_RESOURCES[number];

/**
 * Returns true if the given string is a valid UpdateResource.
 */
export function isValidUpdateResource(resource: string): resource is UpdateResource {
  return VALID_UPDATE_RESOURCES.includes(resource as UpdateResource);
}

/**
 * Format the "invalid resource" error message (per cli-schema.md §1).
 */
export function formatInvalidResourceError(resource: string): string {
  return [
    `Error: "${resource}" is not a valid update resource.`,
    ``,
    `Valid resources:`,
    `  ${VALID_UPDATE_RESOURCES.join(', ')}`,
    ``,
    `Usage: tilde update <resource>`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface UpdateCommandProps {
  resource: string;
  configPath: string;
}

type Phase =
  | { type: 'validating' }
  | { type: 'loading' }
  | { type: 'updating'; config: TildeConfig }
  | { type: 'writing' }
  | { type: 'done'; message: string }
  | { type: 'error'; exitCode: number; message: string };

export function UpdateCommand({ resource, configPath }: UpdateCommandProps) {
  const { exit } = useApp();
  const [phase, setPhase] = useState<Phase>({ type: 'validating' });

  useEffect(() => {
    // T017: validate resource immediately
    if (!resource || !isValidUpdateResource(resource)) {
      process.stderr.write(formatInvalidResourceError(resource ?? '') + '\n');
      process.exit(1);
    }

    // Load config
    setPhase({ type: 'loading' });
    loadConfig(configPath)
      .then(config => setPhase({ type: 'updating', config }))
      .catch(err => {
        const msg = (err as Error).message;
        setPhase({ type: 'error', exitCode: 3, message: `Config error: ${msg}` });
      });
  }, []);

  async function writeUpdated(config: TildeConfig, updated: Partial<TildeConfig>) {
    setPhase({ type: 'writing' });
    try {
      const merged = { ...config, ...updated, schemaVersion: CURRENT_SCHEMA_VERSION };
      const content = JSON.stringify(merged, null, 2) + '\n';
      await atomicWriteConfig(configPath, content);
      setPhase({ type: 'done', message: `Updated ${resource} in ${configPath}` });
    } catch (err) {
      setPhase({ type: 'error', exitCode: 3, message: (err as Error).message });
    }
  }

  // Handle exit codes on error/done
  useEffect(() => {
    if (phase.type === 'done') {
      setTimeout(() => exit(), 200);
    }
    if (phase.type === 'error') {
      const code = phase.exitCode;
      setTimeout(() => process.exit(code), 200);
    }
  }, [phase.type]);

  if (phase.type === 'validating' || phase.type === 'loading') {
    return (
      <Box>
        <Text color="green"><Spinner type="dots" /></Text>
        <Text> Loading config…</Text>
      </Box>
    );
  }

  if (phase.type === 'writing') {
    return (
      <Box>
        <Text color="green"><Spinner type="dots" /></Text>
        <Text> Saving changes…</Text>
      </Box>
    );
  }

  if (phase.type === 'done') {
    return (
      <Box flexDirection="column">
        <Text color="green">✓ {phase.message}</Text>
      </Box>
    );
  }

  if (phase.type === 'error') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1}>
        <Text bold color="red">Update Error</Text>
        <Text>{phase.message}</Text>
      </Box>
    );
  }

  const { config } = phase;

  // Route to matching step component
  if (resource === 'shell') {
    return (
      <Box flexDirection="column">
        <Text bold>Update: Shell</Text>
        <ShellStep
          defaultShell={config.shell}
          onComplete={(data) => writeUpdated(config, { shell: data.shell }).catch(() => {})}
        />
      </Box>
    );
  }

  if (resource === 'editor') {
    return (
      <Box flexDirection="column">
        <Text bold>Update: Editor Configuration</Text>
        <AppConfigStep
          onComplete={(data) => writeUpdated(config, {
            configurations: { ...config.configurations, ...data.configurations },
            editors: data.editors,
          }).catch(() => {})}
        />
      </Box>
    );
  }

  if (resource === 'applications') {
    return (
      <Box flexDirection="column">
        <Text bold>Update: Tools & Applications</Text>
        <ToolsStep
          defaultTools={config.tools.join(', ')}
          onComplete={(data) => writeUpdated(config, { tools: data.tools }).catch(() => {})}
        />
      </Box>
    );
  }

  if (resource === 'browser') {
    return (
      <Box flexDirection="column">
        <Text bold>Update: Browser Selection</Text>
        <BrowserStep
          onComplete={(data) => writeUpdated(config, { browser: data.browser }).catch(() => {})}
        />
      </Box>
    );
  }

  if (resource === 'ai-tools') {
    return (
      <Box flexDirection="column">
        <Text bold>Update: AI Coding Tools</Text>
        <AIToolsStep
          onComplete={(data) => writeUpdated(config, { aiTools: data.aiTools }).catch(() => {})}
        />
      </Box>
    );
  }

  if (resource === 'contexts') {
    return (
      <Box flexDirection="column">
        <Text bold>Update: Workspace Contexts</Text>
        <ContextsStep
          workspaceRoot={config.workspaceRoot}
          initialContexts={config.contexts}
          onComplete={(data) => writeUpdated(config, { contexts: data.contexts }).catch(() => {})}
        />
      </Box>
    );
  }

  if (resource === 'languages') {
    return (
      <Box flexDirection="column">
        <Text bold>Update: Language Versions</Text>
        <LanguagesStep
          versionManagers={config.versionManagers}
          onComplete={(data) => writeUpdated(config, { languages: data.languages }).catch(() => {})}
        />
      </Box>
    );
  }

  // Should never reach here after validation
  return <Text color="red">Unknown resource: {resource}</Text>;
}
